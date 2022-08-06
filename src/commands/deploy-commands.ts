import { token } from '../config'
import { Client, SlashCommandBuilder, Routes } from 'discord.js'
import { REST } from '@discordjs/rest'
import { allCommands } from './all-commands'
import { CommandOption } from './types'

const rest = new REST({ version: '10' }).setToken(token)

interface DeployCommandsArgs {
  client: Client
  guildId: string
}

function getClientId(client: Client) {
  const clientId = client?.user?.id
  if (!clientId) throw new Error('Could not find client user')
  return clientId
}

function getAddOptionFunc(type: CommandOption['type']) {
  switch (type) {
    case 'string':
      return 'addStringOption' as const
    default:
      throw new Error(`Not implemented yet: ${type} slash command option type.`)
  }
}

export async function deployCommands(args: DeployCommandsArgs) {
  const { client, guildId } = args
  const commands = allCommands
    .map((c) => {
      let built: ReturnType<SlashCommandBuilder['addStringOption']> = new SlashCommandBuilder()
        .setName(c.name)
        .setDescription(c.description)
      if (c.options) {
        c.options.forEach(({ name, type, description }) => {
          built = built[getAddOptionFunc(type)]((option) =>
            option.setName(name).setDescription(description)
          )
        })
      }
      return built
    })
    .map((command) => command.toJSON())

  const clientId = getClientId(client)

  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    console.log('Successfully registered application commands.')
  } catch (e) {
    console.error(e)
  }
}

/** Deletes all GUILD commands, not global ones */
export async function deleteGuildCommands(args: DeployCommandsArgs) {
  const { client, guildId } = args
  const clientId = getClientId(client)
  rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
}
