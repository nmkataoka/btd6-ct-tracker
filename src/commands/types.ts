import { ChatInputCommandInteraction } from 'discord.js'

export interface ChatCommand {
  name: string
  description: string
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>
}
