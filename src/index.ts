// Require the necessary discord.js classes
import 'dotenv/config'
import { Client, GatewayIntentBits } from 'discord.js'
import { commandsByName } from './commands/all-commands'
import { deployCommands } from './commands/deploy-commands'

const token = process.env.DISCORD_TOKEN
const guildId = process.env.DISCORD_TEST_GUILD_ID

if (!token) {
  throw new Error('Missing token')
}

if (!guildId) {
  throw new Error('Missing guild id')
}

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log('Registering commands...')
  await deployCommands({ client, guildId, token })
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
