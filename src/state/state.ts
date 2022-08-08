import { Result, Tile, User } from './types'
import { settings } from './settings'
import { Errors } from './errors'
import { banners, relics } from './data'
import { newDate } from './date'

const msInMin = 1000 * 60

type TileId = string

/** Returns remaining claim duration in minutes. */
function getRemainingClaimDuration(tile: Tile, now: Date) {
  if (!tile.claimedAt) {
    throw new Error('Internal Error: getRemainingClaimDuration called on unclaimed tile')
  }
  const remainingDuration =
    (tile.claimedAt.getTime() + settings.claimDuration * msInMin - now.getTime()) / msInMin
  return remainingDuration
}

/** Returns time until expiration, in minutes */
function getTimeTillExpiration(tile: Tile, now: Date) {
  if (!tile.expiresAt) {
    throw new Error('Internal error: getTimeTillExpiration called on unowned tile')
  }
  const timeTillExpiry = (tile.expiresAt.getTime() - now.getTime()) / msInMin
  return timeTillExpiry
}

const createTile = (name: string): Tile => ({
  type: 'blank',
  name,
})

// Currently, banners/relic positions are hardcoded
function initializeTiles() {
  const newTiles: typeof state['tiles'] = {}
  for (let i = 0; i < 6; ++i) {
    const l = indexToTileLetter(i)
    for (let j = 0; j < 7; ++j) {
      const m = indexToTileLetter(j)
      for (let k = 0; k < 7 - j; ++k) {
        const n = indexToTileLetter(k)
        const name = `${l}${m}${n}`.toUpperCase()
        newTiles[name] = createTile(name)
      }
    }
  }
  // Add center tile
  newTiles['MRX'] = createTile('MRX')

  // NK replaced this tile manually (:
  delete newTiles['FAG']
  newTiles['FAH'] = createTile('FAH')

  return newTiles
}

/** helper to generate tilenames like NK does */
function indexToTileLetter(n: number): string {
  return String.fromCharCode(97 + n)
}

interface State {
  tiles: Record<TileId, Tile | undefined>
  users: Record<string, User | undefined>
  tileNames: string[]
}

const state: State = {
  tiles: {},
  users: {},
  tileNames: [],
}

function reinitializeTiles() {
  state.tiles = initializeTiles()
  state.tileNames = Object.keys(state.tiles)
  // Should make a better way to customize the banner/relic tiles
  banners.forEach((tileName) => {
    const tile = state.tiles[tileName]
    if (!tile) {
      throw new Error(`Error initializing tiles: could not find banner tile ${tileName}`)
    }
    tile.type = 'banner'
  })

  relics.forEach((tileName) => {
    const tile = state.tiles[tileName]
    if (!tile) {
      throw new Error(`Error initializing tiles: could not find relic tile ${tileName}`)
    }
    tile.type = 'relic'
  })
}

reinitializeTiles()

function getTile(tileName: string | null): Tile {
  if (!tileName) {
    throw { error: Errors.MissingParameter, message: '❌ The `tile` parameter is required.' }
  }

  const tile = state.tiles[tileName.toUpperCase()]
  if (!tile) {
    throw { error: Errors.TileDoesNotExist, message: `❌ Tile ${tileName} doesn't exist` }
  }
  return tile
}

/**
 * Although it looks like it's just returning the input param this is intended to:
 * - Convert from the Discord user object to our internal user object. Right now they're just similar enough that we can use the same type
 * - Add the user to our internal user object if they don't exist yet
 */
function getUser(u: User): User {
  let user = state.users[u.id]
  if (!user) {
    user = { id: u.id, username: u.username }
    state.users[u.id] = user
  }
  return user
}

/** Used to prevent updating too often for performance */
const cacheDurationInSeconds = 60

/** Used to invalidate the available tiles query cache if someone captures or reports a tile */
let availableTilesQueryIsDirty = true

let lastUpdatedAt = newDate()

/** Updates internal things that are time-based */
export function update() {
  const now = newDate()
  const timeSinceLastUpdate = now.getTime() - lastUpdatedAt.getTime()
  if (timeSinceLastUpdate / 1000 < cacheDurationInSeconds) {
    // We've updated recently
    return
  }
  lastUpdatedAt = now

  for (const tile of Object.values(state.tiles).filter((t): t is Tile => !!t)) {
    if (tile.claimedAt) {
      const duration = getRemainingClaimDuration(tile, now)
      if (duration <= 0) {
        // TODO: handle expired claim
        tile.claimedAt = undefined
        tile.claimedBy = undefined
      }
    }

    if (tile.expiresAt) {
      const duration = getTimeTillExpiration(tile, now)
      if (duration <= 0) {
        tile.expiresAt = undefined
      }
    }
  }

  // Mark the available tiles query for updating
  availableTilesQueryIsDirty = true
}

export function claimTile(tileName: string | null, discordUser: User, force?: boolean): Result {
  const tile = getTile(tileName)
  const user = getUser(discordUser)
  const now = newDate()

  // If tile is already claimed, reject
  let message: string = ''
  if (tile.claimedBy) {
    if (tile.claimedBy !== user) {
      if (!force) {
        const remainingClaimDuration = getRemainingClaimDuration(tile, now)
        message = `⚠️ Tile ${tileName} is claimed by ${
          tile.claimedBy.username
        } for another ${Math.round(
          remainingClaimDuration
        )} minutes. Do you wish to claim it anyway?`
        return { error: Errors.TileIsClaimedByAnotherUser, message }
      } else {
        message = `⚠️ ${user.username} forcefully claimed tile ${tileName}. Previously claimed by ${tile.claimedBy.username}.`
      }
    } else {
      message = `✅ Extended ${user.username}'s claim for tile ${tileName}. Remaining duration: ${settings.claimDuration} min.`
    }
  }

  // Maybe in the future we can check if the tile is already owned and return a warning.
  // For now, I think the accuracy of such a warning will be too low.

  tile.claimedBy = user
  tile.claimedAt = newDate()

  // This should update the available tiles query
  availableTilesQueryIsDirty = true

  if (!message) {
    message = `✅ ${user.username} claimed tile ${tileName} for ${settings.claimDuration} min.`
  }
  return { message }
}

export function unclaimTile(tileName: string | null, discordUser: User, force?: boolean): Result {
  // If not the current claimant, reject
  const user = getUser(discordUser)
  const tile = getTile(tileName)
  const claimant = tile.claimedBy
  const now = newDate()
  let message: string = ''

  if (!claimant) {
    return {
      error: Errors.TileIsNotClaimed,
      message: `❌ Can't unclaim tile ${tileName}: the tile is not claimed.`,
    }
  }
  const remainingClaimDuration = getRemainingClaimDuration(tile, now)
  if (claimant !== user) {
    if (!force) {
      return {
        error: Errors.TileIsClaimedByAnotherUser,
        message: `⚠️ The tile ${tileName} is claimed by ${claimant.username} for another ${remainingClaimDuration} minutes. Do you wish to unclaim it anyway?`,
      }
    } else {
      message = `⚠️ ${user.username} forcefully removed claim from tile ${tileName} which was previously claimed by ${claimant.username}.`
    }
  }

  // Remove claim
  tile.claimedBy = null
  tile.claimedAt = undefined

  // This should update the available tiles query
  availableTilesQueryIsDirty = true

  if (!message) {
    message = `✅ ${user.username} removed claim from tile ${tileName} without capturing. The tile may now be claimed by another user.`
  }

  return { message }
}

export function captureTile(tileName: string | null, discordUser: User): Result {
  const user = getUser(discordUser)
  const tile = getTile(tileName)
  const claimant = tile.claimedBy

  if (!claimant) {
    return {
      error: Errors.TileIsNotClaimed,
      message: `❌ Tiles must be claimed before capturing. Please claim it first with "/claim ${tileName}"`,
    }
  }

  // If not the claimant, reject
  if (user !== claimant) {
    return {
      error: Errors.TileIsClaimedByAnotherUser,
      message: `❌ This tile is claimed by ${claimant.username}. If you wish to capture it, override their claim with "/claim ${tileName}".`,
    }
  }

  // Set expiration date
  tile.claimedBy = undefined
  tile.claimedAt = undefined
  tile.expiresAt = newDate(newDate().getTime() + 24 * 60 * msInMin)

  // This should change the available tiles query
  availableTilesQueryIsDirty = true

  return {
    message: `✅ ${user.username} captured tile ${tileName}. Great work monke strategist!`,
  }
}

export function reportTaken(tileName: string | null, discordUser: User): Result {
  // Reset timer and stuff
  const tile = getTile(tileName)
  tile.expiresAt = newDate()
  return {
    message: '✅ Thank you for reporting. Players searching for tiles to capture will be notified.',
  }
}

export function setExpiresIn(
  tileName: string | null,
  discordUser: User,
  expiresIn: string | null
): Result {
  const tile = getTile(tileName)
  if (!expiresIn) {
    return {
      error: Errors.MissingParameter,
      message: '❌ The `time` left until the tile expires must be specified.',
    }
  }
  const [h, m] = expiresIn.split(':')
  const hours = parseInt(h, 10)
  const minutes = parseInt(m, 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return {
      error: Errors.UnprocessableParameter,
      message: '❌ Please format the time remaining as HOURS:MINUTES, for example 06:23',
    }
  }

  tile.expiresAt = newDate(newDate().getTime() + (hours * 60 + minutes) * msInMin)
  return {
    message:
      '✅ Thank you for reporting. This helps us recapture tiles as soon as they turn neutral.',
  }
}

function getClaimedTiles(): string[] {
  return state.tileNames.filter((tileName) => state.tiles[tileName]?.claimedBy)
}

function getAvailableRelicsAndBanners(): string[] {
  // This could be cached at the start of the game since they don't change
  return state.tileNames.filter((tileName) => {
    const tile = state.tiles[tileName]
    return tile && ['banner', 'relic'].includes(tile.type) && !tile.claimedAt && !tile.expiresAt
  })
}

function getSoonExpiringRelicsAndBanners(amount: number): string[] {
  // Could keep a sorted data structure but it's only ~150 items
  return state.tileNames
    .filter((tileName) => {
      const tile = state.tiles[tileName]
      return tile && ['banner', 'relic'].includes(tile.type) && !tile.claimedAt && !!tile.expiresAt
    })
    .sort((a, b) => {
      const tileA = state.tiles[a] as Tile
      const tileB = state.tiles[b] as Tile
      const expA = tileA.expiresAt as Date
      const expB = tileB.expiresAt as Date
      return expA.getTime() - expB.getTime()
    })
    .slice(0, amount)
}

let availableTilesCache: { claimed: string[]; available: string[]; expiring: string[] } = {
  claimed: [],
  available: [],
  expiring: [],
}

/** Returns all claimed relics/banners, all available unclaimed relics/banners, and the next 10 relics/banners to expire */
function _getAvailableTiles() {
  if (availableTilesQueryIsDirty) {
    availableTilesQueryIsDirty = false

    availableTilesCache = {
      claimed: getClaimedTiles(),
      available: getAvailableRelicsAndBanners(),
      expiring: getSoonExpiringRelicsAndBanners(10),
    }
  }
  return availableTilesCache
}

export function getAvailableTiles(): Result {
  const now = newDate()
  const { claimed, available, expiring } = _getAvailableTiles()
  const claimedText =
    claimed
      .map((tileName) => {
        const tile = getTile(tileName)
        const { claimedBy, claimedAt, expiresAt, type } = tile

        return `${tileName}, ${type}, ${claimedBy?.username ?? 'Unknown'}, ${
          claimedAt && Math.round(getRemainingClaimDuration(tile, now))
        }m, ${expiresAt && Math.round(getTimeTillExpiration(tile, now))}m`
      })
      .join('\n') || 'None'

  /** There could be many "available", let's limit to 10 */
  const numAvailable = available.length
  const availableText =
    available
      .slice(0, 10)
      .map((tileName) => `${tileName}, ${state.tiles[tileName]?.type ?? 'Unknown'}`)
      .join('\n') || 'None'

  const expiringText =
    expiring
      .map((tileName) => {
        const tile = getTile(tileName)
        const { expiresAt, type } = tile
        return `${tileName}, ${type}, ${expiresAt && Math.round(getTimeTillExpiration(tile, now))}m`
      })
      .join('\n') || 'None'

  return {
    message: `**Claimed Tiles**
*Tile, Type, Claimed By, Claim Expires In, Tile Expires In*
${claimedText}

**Available Relics and Banners**
*Tile, Type*
${availableText}${numAvailable > 10 && '\n' + String(numAvailable - 10) + ' more...'}

**Expiring Soon**
*Tile, Type, Tile Expires In*
${expiringText}

Last updated: <t:${Math.round(
      now.getTime() / 1000
    )}:R>. To update this message, use the "/available" command.
`,
  }
}

/** Only exposed for testing and debugging! */
export const stateDebug = {
  state,
  getClaimedTiles,
  getAvailableRelicsAndBanners,
  getSoonExpiringRelicsAndBanners,
  reinitializeTiles,
}
