import { pingCommand } from './ping'
import { ChatCommand } from './types'

export const allCommands: ChatCommand[] = [pingCommand]
export const commandsByName = allCommands.reduce((acc, c) => {
  acc[c.name] = c
  return acc
}, {} as Record<string, ChatCommand | undefined>)
