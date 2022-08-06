import 'dotenv/config'
const token = process.env.DISCORD_TOKEN as string
const testGuildId = process.env.DISCORD_TEST_GUILD_ID as string
const isDev = process.env.NODE_ENV !== 'production'

if (!token) {
  throw new Error('Missing token')
}

if (!testGuildId) {
  throw new Error('Missing guild id')
}

export { token, testGuildId, isDev }
