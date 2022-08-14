import { Errors } from './errors'

export interface User {
  /** Unique discord id */
  id: string

  /** Readable username, not unique or constant */
  username: string
}

export interface Result {
  error?: Errors
  message: string
  ephemeral?: boolean
}

export interface Tile {
  type: 'blank' | 'banner' | 'relic'
  name: string
  claimedBy?: User | null
  claimedAt?: Date
  expiresAt?: Date
  expirationConfirmed?: boolean
}

/** type guard to help with catching thrown Results */
export function isResult(r: unknown): r is Result {
  return r != null && typeof r === 'object' && r.hasOwnProperty('message')
}
