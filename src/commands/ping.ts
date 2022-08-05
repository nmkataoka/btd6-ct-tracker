import { ChatCommand } from './types'

export const pingCommand: ChatCommand = {
  name: 'ping',
  description: 'Replies with Pong!',
  execute: async (interaction) => interaction.reply('Pong'),
}
