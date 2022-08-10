// Require the necessary discord.js classes
import { Client, GatewayIntentBits } from 'discord.js'
import { token, testGuildId, isDev } from './config'
import { commandsByName } from './commands/all-commands'
import { deleteGuildCommands, deployCommands } from './commands/deploy-commands'

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const guildId = testGuildId

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log('Registering commands...')
  if (isDev) {
    await deleteGuildCommands({ client, guildId })
    await deployCommands({ client, guildId })
  }
  console.log('Ready!')
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction
  const command = commandsByName[commandName]

  if (command) {
    command.execute(interaction)
  }
})

// Login to Discord with your client's token
client.login(token)
