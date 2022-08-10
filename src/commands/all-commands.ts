import { ChatInputCommandInteraction, InteractionCollector } from 'discord.js'
import { isResult, Result } from '../state/types'
import {
  claimTile,
  captureTile,
  unclaimTile,
  reportTaken,
  setExpiresIn,
  getAvailableTiles,
} from '../state/state'
import { ChatCommand, CommandOption } from './types'

const tileOption: CommandOption = { type: 'string', name: 'tile', description: 'The tile to claim' }

const processResult =
  (executor: (interaction: ChatInputCommandInteraction) => Promise<Result> | Result) =>
  async (interaction: ChatInputCommandInteraction) => {
    try {
      const resp = await executor(interaction)
      if (!interaction.replied) {
        interaction.reply(resp.message)
      }
    } catch (err) {
      console.error(err)
      if (isResult(err)) {
        interaction.reply({ ephemeral: true, content: `${err.message} (${err.error})` })
      } else if (typeof err === 'string') {
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

let availableCommandMessageIds: Record<string, string | undefined> = {}

async function createNewAvailableMessage(
  interaction: ChatInputCommandInteraction,
  content: string
) {
  const channelId = interaction.channelId
  await interaction.reply(content)
  const message = await interaction.fetchReply()
  availableCommandMessageIds[channelId] = message.id
}

/** Updates a persistent message with available tiless. Creates the message if can't find it. */
const availableCommand: ChatCommand = {
  name: 'available',
  description: 'Returns a list of claimed tiles and available or soon-expiring banners and relics.',
  execute: processResult(async (i) => {
    const { message: content } = getAvailableTiles()
    const messageId = availableCommandMessageIds[i.channelId]
    if (!i.channel || !messageId) {
      await createNewAvailableMessage(i, content)
    } else {
      const message = await i.channel.messages.fetch(messageId)
      if (!message) {
        createNewAvailableMessage(i, content)
      } else {
        message.edit(content)
        return { message: 'Updated pinned post!' }
      }
    }
    return { message: 'Success' }
  }),
}

export const simpleCommands: ChatCommand[] = [
  availableCommand,
  pingCommand,
  capture,
  claimCommand,
  unclaimCommand,
  expiresInCommand,
  takenCommand,
]
export const commandsByName = simpleCommands.reduce((acc, c) => {
  acc[c.name] = c
  return acc
}, {} as Record<string, ChatCommand | undefined>)
