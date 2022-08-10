// Require the necessary discord.js classes
import { Client, GatewayIntentBits } from 'discord.js'
import { token, testGuildId, isDev } from '../config'
import { deleteGuildCommands } from '../commands/deploy-commands'

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const guildId = testGuildId

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log('Registering commands...')
  if (isDev) {
    await deleteGuildCommands({ client, guildId })
  } else {
    console.error('This script only works in dev mode.')
  }
  console.log('Done! All guild commands for this bot have been removed. Quitting.')
  process.exit()
})

// Login to Discord with your client's token
client.login(token)
