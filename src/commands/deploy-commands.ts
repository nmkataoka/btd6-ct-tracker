import { Client, SlashCommandBuilder, Routes } from 'discord.js'
import { REST } from '@discordjs/rest'
import { allCommands } from './all-commands'

interface DeployCommandsArgs {
  client: Client
  token: string
  guildId: string
}

export async function deployCommands(args: DeployCommandsArgs) {
  const { client, token, guildId } = args
  const commands = allCommands
    .map((c) => new SlashCommandBuilder().setName(c.name).setDescription(c.description))
    .map((command) => command.toJSON())

  const clientId = client?.user?.id
  if (!clientId) throw new Error('Could not find client user')

  const rest = new REST({ version: '10' }).setToken(token)
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
    console.log('Successfully registered application commands.')
  } catch (e) {
    console.error(e)
  }
}
