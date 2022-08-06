import { User } from './types'
import { settings } from './settings'

const msInMin = 1000 * 60

type TileId = string

interface Tile {
  type: 'blank' | 'banner' | 'relic'
  name: string
  claimedBy?: User | null
  claimedAt?: Date
  expiresAt?: Date
  expirationConfirmed?: boolean
}

/** Returns remaining claim duration in minutes. */
function getRemainingClaimDuration(tile: Tile) {
  if (!tile.claimedAt) {
    return -1
  }
  const remainingDuration =
    (tile.claimedAt.valueOf() + settings.claimDuration * msInMin - new Date().valueOf()) / msInMin
  return remainingDuration
}

const tiles: Record<TileId, Tile | undefined> = {
  AAB: {
    type: 'blank',
    name: 'AAB',
  },
}

function getTile(tileName: string | null): Tile {
  if (!tileName) {
    throw new Error('The `tile` parameter is required.')
  }

  const tile = tiles[tileName]
  if (!tile) {
    throw new Error(`Tile ${tileName} doesn't exist`)
  }
  return tile
}

const users: Record<string, User | undefined> = {}

function getUser(u: User): User {
  let user = users[u.id]
  if (!user) {
    user = { id: u.id, username: u.username }
    users[u.id] = user
  }
  return user
}

export function claimTile(tileName: string | null, discordUser: User, force?: boolean): string {
  const tile = getTile(tileName)
  const user = getUser(discordUser)

  // If tile is already claimed, reject
  let msg: string = ''
  if (tile.claimedBy) {
    if (tile.claimedBy !== user) {
      if (!force) {
        const remainingClaimDuration = getRemainingClaimDuration(tile) / msInMin
        throw new Error(
          `Tile ${tileName} is claimed by ${tile.claimedBy} for another ${Math.round(
            remainingClaimDuration
          )} minutes. Use "/claim ${tileName} force" if you're sure they're not trying to capture it.`
        )
      } else {
        msg = `⚠️ ${user.username} forcefully claimed tile ${tileName}. Previously claimed by ${tile.claimedBy.username}`
      }
    } else {
      msg = `✅ Extended ${user.username}'s claim for tile ${tileName}. Remaining duration: ${settings.claimDuration} min`
    }
  }

  // Maybe in the future we can check if the tile is already owned and return a warning.
  // For now, I think the accuracy of such a warning will be too low.

  tile.claimedBy = user
  tile.claimedAt = new Date()
  if (msg) {
    return msg
  }
  return `✅ ${user.username} claimed tile ${tileName} for ${settings.claimDuration} min.`
}

export function unclaimTile(tileName: string | null, discordUser: User) {
  // If not the current claimant, reject
  const user = getUser(discordUser)
  const tile = getTile(tileName)
  const claimant = tile.claimedBy

  if (!claimant) {
    throw new Error("Can't unclaim tile: the tile is not claimed.")
  }
  const remainingClaimDuration = getRemainingClaimDuration(tile)
  if (claimant !== user) {
    throw new Error(
      `The tile ${tileName} is claimed by ${claimant.username} for another ${remainingClaimDuration} minutes. Please wait until their claim expires or they unclaim the tile to claim it.`
    )
  }

  // Remove claim
  tile.claimedBy = null
  tile.claimedAt = undefined

  return `✅ ${user.username} removed claim from ${tileName} without capturing. The tile may now be claimed by another user.`
}

export function captureTile(tileName: string | null, discordUser: User, force?: boolean) {
  const user = getUser(discordUser)
  const tile = getTile(tileName)
  const claimant = tile.claimedBy

  if (!claimant) {
    throw new Error(
      `This tile ${tileName} hasn't been claimed. Please claim it first with "/claim ${tileName}`
    )
  }

  // If not the claimant, reject
  let msg = ''
  if (user !== claimant) {
    msg = `⚠️ ${user.username} captured a tile that was claimed by someone else. If this was a mistake, please let them know so they sort it out. The tile ${tileName} was originally claimed by ${claimant.username}.`
  }

  // Set expiration date
  tile.claimedBy = null
  tile.expiresAt = new Date(new Date().getTime() + 24 * 60 * msInMin)
  return `✅ ${user.username} captured tile ${tileName}. Great work monke strategist!`
}

export function reportTaken(tileName: string | null, discordUser: User) {
  // Reset timer and stuff
  const tile = getTile(tileName)
  tile.expiresAt = new Date()
  return '✅ Thank you for reporting. Players searching for tiles to capture will be notified.'
}

export function setExpiresIn(tileName: string | null, discordUser: User, expiresIn: string | null) {
  const tile = getTile(tileName)
  if (!expiresIn) {
    throw new Error('The `time` left until the tile expires must be specified.')
  }
  const [h, m] = expiresIn.split(':')
  const hours = parseInt(h, 10)
  const minutes = parseInt(m, 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error('Please format the time remaining as HOURS:MINUTES, for example 06:23')
  }

  tile.expiresAt = new Date(new Date().getTime() + (hours * 60 + minutes) * msInMin)
  return '✅ Thank you for reporting. This helps us recapture tiles as soon as they turn neutral.'
}
