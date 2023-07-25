import { config as dotenvConfig } from  'dotenv';
import fetch from 'node-fetch';
import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

dotenvConfig();

const bot = new Client({ intents: [11, 12] });

const botChannelID = '1090929641457467465'; // Replace with your Discord channel ID

let lastSentTxHash; 

const commands = [
    new SlashCommandBuilder()
    .setName('ethlasttx')
    .setDescription('Get latest transaction of specific Ethereum address'),
]
.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

bot.login(process.env.DISCORD_BOT_TOKEN);

bot.once('ready', async () => {
    console.log(`Logged in as ${bot.user.tag}!`);

    setInterval(async () => {
        const address = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${etherscanApiKey}`;

        let response = await fetch(url);
        let data = await response.json();

        if(data.status === "1") {
            let latestTx = data.result[0];
            if (latestTx.hash !== lastSentTxHash) { // Only send message if the latest transaction is different from the last one sent
                lastSentTxHash = latestTx.hash;
                let message = `Latest transaction: \nFrom: ${latestTx.from} \nTo: ${latestTx.to} \nValue: ${latestTx.value} \nHash: ${latestTx.hash}`;
                let channel = bot.channels.cache.get(botChannelID);
                if (channel) {
                    channel.send(message);
                } else {
                    console.log('Channel not found');
                }
            }
        } else {
            console.log('No transactions found for this address');
        }
    }, 6000); // Fetch and send message every 60 seconds (60000 milliseconds)
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ethlasttx') {
        const address = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc&apikey=${etherscanApiKey}`;

        let response = await fetch(url);
        let data = await response.json();

        if(data.status === "1") {
            let latestTx = data.result[0];
            await interaction.reply(`Latest transaction: \nFrom: ${latestTx.from} \nTo: ${latestTx.to} \nValue: ${latestTx.value} \nHash: ${latestTx.hash}`);
        } else {
            await interaction.reply('No transactions found for this address');
        }
    }
});
