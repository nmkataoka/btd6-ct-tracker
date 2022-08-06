import { ChatInputCommandInteraction } from 'discord.js'
import { claimTile, captureTile, unclaimTile, reportTaken, setExpiresIn } from '../state/state'
import { ChatCommand, CommandOption } from './types'

const tileOption: CommandOption = { type: 'string', name: 'tile', description: 'The tile to claim' }

const processResult =
  (executor: (interaction: ChatInputCommandInteraction) => string) =>
  async (interaction: ChatInputCommandInteraction) => {
    try {
      const resp = executor(interaction)
      interaction.reply(resp)
    } catch (err) {
      if (typeof err === 'string') {
        interaction.reply({ ephemeral: true, content: `❌ ${err}` })
      } else {
        interaction.reply({ ephemeral: true, content: `❌ ${String(err)}` })
      }
    }
  }

const claimCommand: ChatCommand = {
  name: 'claim',
  description: `Claims a tile. You should follow up with either /capture or /unclaim.`,
  execute: processResult((i) => claimTile(i.options.getString('tile'), i.user)),
  options: [tileOption],
}

const pingCommand: ChatCommand = {
  name: 'ping',
  description: 'Replies with Pong!',
  execute: async (interaction) => interaction.reply('Pong!'),
}

const capture: ChatCommand = {
  name: 'capture',
  description: `Report that you captured a tile. If you haven't captured it yet, use "/claim".`,
  execute: processResult((i) => captureTile(i.options.getString('tile'), i.user)),
  options: [tileOption],
}

const unclaimCommand: ChatCommand = {
  name: 'unclaim',
  description: 'Ends a tile claim without capturing it. Allows other players to claim the tile.',
  execute: processResult((i) => unclaimTile(i.options.getString('tile'), i.user)),
  options: [tileOption],
}

const takenCommand: ChatCommand = {
  name: 'taken',
  description: 'Reports a tile as taken by another team.',
  execute: processResult((i) => reportTaken(i.options.getString('tile'), i.user)),
  options: [tileOption],
}

const expiresInCommand: ChatCommand = {
  name: 'expires',
  description: 'Sets the time that a tile will expire so we can better plan when to retake it.',
  execute: processResult((i) =>
    setExpiresIn(i.options.getString('tile'), i.user, i.options.getString('time'))
  ),
  options: [
    tileOption,
    {
      type: 'string',
      name: 'time',
      description: `The time left until the tile expires. HOURS:MINUTES like 06:01.`,
    },
  ],
}

export const allCommands: ChatCommand[] = [
  pingCommand,
  capture,
  claimCommand,
  unclaimCommand,
  expiresInCommand,
  takenCommand,
]
export const commandsByName = allCommands.reduce((acc, c) => {
  acc[c.name] = c
  return acc
}, {} as Record<string, ChatCommand | undefined>)
