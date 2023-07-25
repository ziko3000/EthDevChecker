import { Client, CommandInteraction, TextChannel, EmbedBuilder, ActivityType, PresenceData } from 'discord.js';
import axios from 'axios';
import { config as dotenvConfig } from 'dotenv';
import { Command } from './commands/command.ts';
import { ethers  } from 'ethers';
import { HelpCommand } from './commands/help.ts';

dotenvConfig();

const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const ethPriceAPI = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"

interface EtherscanResponse {
  status: string;
  result: any[];
}

export class Bot extends Client {
  private botChannelID: string = '1090929641457467465'; // Replace with your Discord channel ID
  private lastSentTxHash: string | null = null;
  private latestTxValue: string | null = null;
  private latestTxTimestamp: number | null = null;

  constructor() {
    super({ intents: [8, 11, 12] });

    this.once('ready', async () => {
      console.log(`Logged in as ${this.user?.tag}!`);
      setInterval(() => this.checkLatestTransaction(), 2000); 
      setInterval(() => this.updateBotPresence(), 3000);
    });

    this.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) return;
      await this.handleCommand(interaction as CommandInteraction);
    });
  }

  async handleCommand(interaction: CommandInteraction) {
    if (interaction.commandName === 'help') {
      const command = new HelpCommand();
      await command.execute(interaction);
    }
  }

  async checkLatestTransaction() {
    try {
      const address = '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae';
      const pageSize = 100;
      const minValue = ethers.parseEther("8000");

      let currentPage = 1;
      let latestTx = null;
      let hasMorePages = true;

      while (hasMorePages) {
        const url = `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=${currentPage}&offset=${pageSize}&sort=desc&apikey=${etherscanApiKey}`;

        let response = await axios.get(url);
        let data = response.data as EtherscanResponse;

        if (data.status === "1") {
          latestTx = data.result.find(tx => tx.isError === "0" && BigInt(tx.value) >= minValue);

          if (latestTx) {
            break;
          } else if (data.result.length < pageSize) {
            hasMorePages = false;
          } else {
            currentPage++;
          }
        } else {
          console.log('Error while fetching transactions from Etherscan API');
          return;
        }
      }

      if (latestTx && latestTx.hash !== this.lastSentTxHash) {
        this.lastSentTxHash = latestTx.hash;
        this.latestTxValue = ethers.formatEther(latestTx.value);
        this.latestTxTimestamp = parseInt(latestTx.timeStamp);

        let priceResponse = await axios.get(ethPriceAPI);
        let usdValue = (parseFloat(this.latestTxValue) * priceResponse.data.ethereum.usd).toFixed(2);

        const embedMessage = new EmbedBuilder()
  .setColor(0x0099FF)
  .setTitle('💰 Big Ethereum Transaction Alert!')
  .setURL(`https://etherscan.io/tx/${latestTx.hash}`)
  .setAuthor({ name: 'Transaction Information', iconURL: 'https://etherscan.io/images/logo-ether.png' })
  .setDescription(`The Ethereum Foundation has executed a large transaction. Here are the details:`)
  .setThumbnail('https://etherscan.io/images/logo-ether.png')
  .addFields(
    { name: '🔖 Transaction Receipt', value: `[View on Etherscan](https://etherscan.io/tx/${latestTx.hash})`, inline: true },
    { name: '🚀 Origin Wallet', value: `It all started at wallet: \`${latestTx.from}\``, inline: true },
    { name: '🎯 Destination Wallet', value: `Destination wallet: \`${latestTx.to}\``, inline: true },
    { 
      name: '💎 Transaction Value', 
      value: `The payload: **${parseFloat(this.latestTxValue).toLocaleString('en-US', {useGrouping: true}).replace(/,/g, ' ')} Ether** (That's approximately **$${(parseFloat(usdValue)/1000000).toFixed(2)} million**!)`, 
      inline: true 
    },
    { name: '\u200B', value: '\u200B' },
  )


        let channel = this.channels.cache.get(this.botChannelID);
        if (channel instanceof TextChannel) {
          channel.send({ embeds: [embedMessage] });
        } else {
          console.log('Channel not found');
        }
      } else {
        console.log('No transactions found for this amount');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error occurred in checkLatestTransaction: ${error.message}`);
      } else {
        console.error('An unexpected error occurred in checkLatestTransaction.');
      }
    }
  }

  async updateBotPresence(): Promise<void> {
    try {
      if (this.latestTxValue && this.latestTxTimestamp) {
        let priceResponse = await axios.get(ethPriceAPI);
        let usdValue = (parseFloat(this.latestTxValue) * priceResponse.data.ethereum.usd).toFixed(2);

        let txDate = new Date(this.latestTxTimestamp * 1000);

        let timeDifference = new Date().getTime() - txDate.getTime();
        let differenceInDays = Math.floor(timeDifference / (1000 * 3600 * 24));

        const presenceData: PresenceData = {
          activities: [{
            name: `$${usdValue} | ${differenceInDays} days ago`,
            type: ActivityType.Watching,
          }],
          status: 'online',
        };
        await this.user!.setPresence(presenceData);
        console.log('Bot presence updated.');
      } else {
        console.error('Failed to update bot presence: No transactions found.');
      }
    } catch (error) {
      console.error('Failed to update bot presence:', error);
    }
  }
}
