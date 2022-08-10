import { banners, relics } from './data'
import { newDate, resetSystemTime, setSystemTime, toUnixTime } from './date'
import { Errors } from './errors'
import { captureTile, claimTile, getAvailableTiles, stateDebug, unclaimTile } from './state'
import { Tile } from './types'

const { state, reinitializeTiles } = stateDebug

const discordUserA = { username: 'vrej', id: 'discordUserA' }
const discordUserB = { username: 'sadge', id: 'discordUserB' }

describe('state', () => {
  beforeEach(() => {
    setSystemTime(new Date('2022-01-01T00:00:00.000Z'))
    reinitializeTiles()
  })

  afterEach(() => {
    resetSystemTime()
  })

  describe('map', () => {
    it('initializes correct number of tiles', () => {
      /** The map radius */
      const r = 7
      /** Formula for the # of hexagon tiles in a hexagon map as a function of the radius (in hex tiles) */
      const numHexes = 3 * r ** 2 + 3 * r + 1
      expect(Object.values(state.tiles).length).toEqual(numHexes)
      expect(state.tileNames.length).toEqual(numHexes)
    })

    it('spot check some specific hex names', () => {
      const validTileNames = ['AAB', 'MRX', 'AGA', 'AAG']
      validTileNames.forEach((tileName) => {
        expect(state.tiles[tileName]).not.toBeUndefined()
        expect(state.tileNames.includes(tileName)).toEqual(true)
      })

      expect(state.tiles['AGB']).toBeUndefined()
      expect(state.tiles['ABG']).toBeUndefined()
    })

    it('initializes correct number of banner and relic tiles', () => {
      const banners = Object.values(state.tiles).filter((tile) => (tile as Tile).type === 'banner')
      expect(banners.length).toEqual(24)
      const relics = Object.values(state.tiles).filter((tile) => (tile as Tile).type === 'relic')
      expect(relics.length).toEqual(24)
    })
  })

  describe('claimTile', () => {
    it('successfully claim an unclaimed tile', () => {
      expect(claimTile('AAB', discordUserA).message).toEqual('✅ vrej claimed tile AAB for 30 min.')
      expect(claimTile('ACB', discordUserB).message).toEqual(
        '✅ sadge claimed tile ACB for 30 min.'
      )
    })

    it('successfully extend a tile claim', () => {
      claimTile('AAB', discordUserA)
      expect(claimTile('AAB', discordUserA).message).toEqual(
        `✅ Extended vrej's claim for tile AAB. Remaining duration: 30 min.`
      )
    })

    it('errors trying to claim a tile claimed by someone else', () => {
      // TODO: change this to a button interaction
      claimTile('AAB', discordUserB)
      const result = claimTile('AAB', discordUserA)
      expect(result.error).toEqual(Errors.TileIsClaimedByAnotherUser)
      expect(result.message).toEqual(
        `⚠️ Tile AAB is claimed by ${discordUserB.username} for another 30 minutes. Do you wish to claim it anyway?`
      )
    })

    it('succeeds with warning when forcefully claiming a tile claimed by someone else', () => {
      claimTile('AAB', discordUserB)
      const result = claimTile('AAB', discordUserA, true)
      expect(result.error).toBeUndefined()
      expect(result.message).toEqual(
        `⚠️ ${discordUserA.username} forcefully claimed tile AAB. Previously claimed by ${discordUserB.username}.`
      )
    })

    // it.skip('warning trying to claim a tile recently claimed by another team member', () => {
    // TODO: add a button in this situation to force claim
    // })
  })

  describe('unclaimTile', () => {
    it('successfully unclaim a claimed tile', () => {
      claimTile('AAB', discordUserA)
      const result = unclaimTile('AAB', discordUserA)
      expect(result.error).toBeUndefined()
      expect(result.message).toEqual(
        `✅ ${discordUserA.username} removed claim from tile AAB without capturing. The tile may now be claimed by another user.`
      )
    })

    it('errors when unclaiming an unclaimed tile', () => {
      const result = unclaimTile('AAB', discordUserA)
      expect(result.error).toEqual(Errors.TileIsNotClaimed)
      expect(result.message).toEqual("❌ Can't unclaim tile AAB: the tile is not claimed.")
    })

    it('warning when unclaiming a tile claimed by someone else', () => {
      // TODO: add button in this situation
      claimTile('AAB', discordUserA)
      const result = unclaimTile('AAB', discordUserB)
      expect(result.error).toEqual(Errors.TileIsClaimedByAnotherUser)
      expect(result.message).toEqual(
        `⚠️ The tile AAB is claimed by ${discordUserA.username} for another 30 minutes. Do you wish to unclaim it anyway?`
      )
    })

    it('succeeds with warning when forcefully unclaiming a tile', () => {
      claimTile('AAB', discordUserA)
      const result = unclaimTile('AAB', discordUserB, true)
      expect(result.error).toBeUndefined()
      expect(result.message).toEqual(
        `⚠️ ${discordUserB.username} forcefully removed claim from tile AAB which was previously claimed by ${discordUserA.username}.`
      )
    })
  })

  describe('captureTile', () => {
    it('successfully capture a claimed tile', () => {
      claimTile('AAB', discordUserA)
      const result = captureTile('AAB', discordUserA)
      expect(result.error).toBeUndefined()
      expect(result.message).toEqual(
        `✅ ${discordUserA.username} captured tile AAB. Great work monke strategist!`
      )
    })

    it('errors when capturing an unclaimed tile', () => {
      const result = captureTile('AAB', discordUserA)
      expect(result.error).toEqual(Errors.TileIsNotClaimed)
      expect(result.message).toEqual(
        `❌ Tiles must be claimed before capturing. Please claim it first with "/claim AAB"`
      )
    })

    it('errors when capturing a tile claimed by someone else', () => {
      claimTile('AAB', discordUserA)
      const result = captureTile('AAB', discordUserB)
      expect(result.error).toEqual(Errors.TileIsClaimedByAnotherUser)
      expect(result.message).toEqual(
        `❌ This tile is claimed by ${discordUserA.username}. If you wish to capture it, override their claim with "/claim AAB".`
      )
    })
  })

  describe('time-sensitive tests', () => {
    it('tile expiration is set correctly', () => {
      const [bannerA] = banners
      claimTile(bannerA, discordUserA)
      setSystemTime(new Date('2022-01-01T00:05:00.000Z'))
      captureTile(bannerA, discordUserA)
      expect(state.tiles[bannerA]?.expiresAt?.toISOString()).toEqual('2022-01-02T00:05:00.000Z')
    })
  })

  describe('reportTaken', () => {})

  describe('setExpiresIn', () => {})

  describe('internal helpers', () => {
    it('getSoonExpiringRelicsAndBanners', () => {
      const [bannerA] = banners
      claimTile(bannerA, discordUserA)
      setSystemTime(new Date('2022-01-01T00:05:00.000Z'))
      captureTile(bannerA, discordUserA)
      setSystemTime(new Date('2022-01-01T00:05:00.000Z'))
      const soonExpiring = stateDebug.getSoonExpiringRelicsAndBanners(10)
      expect(soonExpiring.length).toEqual(1)
      expect(soonExpiring[0]).toEqual(bannerA)
    })
  })

  describe('getAvailableTiles', () => {
    it('return correct message initially', () => {
      const result = getAvailableTiles()
      expect(result.message).toEqual(`**Claimed Tiles**
*Tile, Type, Claimed By, Claim Expires In, Tile Expires In*
None

**Available Relics and Banners**
*Tile, Type*
${state.tileNames
  .map((tileName) => state.tiles[tileName])
  .filter((tile): tile is Tile => !!tile && (tile.type === 'relic' || tile.type === 'banner'))
  .map((tile) => `${tile.name}, ${tile.type}`)
  .slice(0, 10)
  .join('\n')}
38 more...

**Expiring Soon**
*Tile, Type, Tile Expires In*
None

Last updated: <t:${toUnixTime(newDate())}:R>. To update this message, use the "/available" command.
`)
    })

    it('returns correct message when there are lots of different tiles', () => {
      const [bannerA, bannerB, ...otherBanners] = banners
      const [relicA, relicB, ...otherRelics] = relics
      claimTile(bannerA, discordUserA)
      setSystemTime(new Date('2022-01-01T00:05:00.000Z'))
      captureTile(bannerA, discordUserA)
      setSystemTime(new Date('2022-01-01T23:30:00.000Z'))
      claimTile(bannerB, discordUserA)
      claimTile(relicA, discordUserB)
      setSystemTime(new Date('2022-01-01T23:35:00.000Z'))
      captureTile(relicA, discordUserB)
      setSystemTime(new Date('2022-01-01T23:40:00.000Z'))
      claimTile(relicB, discordUserB)
      setSystemTime(new Date('2022-01-01T23:45:00.000Z'))

      const result = getAvailableTiles()
      expect(result.message).toEqual(`**Claimed Tiles**
*Tile, Type, Claimed By, Claim Expires In, Tile Expires In*
${bannerB}, banner, vrej, 15m, undefinedm
${relicB}, relic, sadge, 25m, undefinedm

**Available Relics and Banners**
*Tile, Type*
${state.tileNames
  .map((tileName) => state.tiles[tileName])
  .filter(
    (tile): tile is Tile =>
      !!tile && (otherBanners.includes(tile.name) || otherRelics.includes(tile.name))
  )
  .map((tile) => `${tile.name}, ${tile.type}`)
  .slice(0, 10)
  .join('\n')}
34 more...

**Expiring Soon**
*Tile, Type, Tile Expires In*
${bannerA}, banner, 20m
${relicA}, relic, 1430m

Last updated: <t:${toUnixTime(newDate())}:R>. To update this message, use the "/available" command.
`)
    })
  })
})
