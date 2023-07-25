import { REST, Routes } from 'discord.js';
import { Bot } from './bot.ts';
import { HelpCommand } from './commands/help.ts';

const clientId = process.env.CLIENT_ID as string;
const guildId = process.env.GUILD_ID as string;
const botToken = process.env.DISCORD_BOT_TOKEN as string;

const commands = [
  new HelpCommand()
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(botToken);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

const bot = new Bot();
bot.login(botToken);

