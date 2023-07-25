import { CommandInteraction } from "discord.js";

export abstract class Command {
  abstract name: string;
  abstract description: string;

  abstract execute(interaction: CommandInteraction): Promise<void>;

  toJSON() {
    return {
      name: this.name,
      description: this.description,
    };
  }
}
