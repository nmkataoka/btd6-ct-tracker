import { ChatInputCommandInteraction } from 'discord.js'

export interface CommandOption {
  type:
    | 'string'
    | 'integer'
    | 'boolean'
    | 'user'
    | 'channel'
    | 'role'
    | 'number'
    | 'mentionable'
    | 'attachment'
  name: string
  description: string
}

export interface ChatCommand {
  name: string
  description: string
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>
  options?: CommandOption[]
}

export type CommandExecutor<T extends unknown[]> = (args: T) => string
