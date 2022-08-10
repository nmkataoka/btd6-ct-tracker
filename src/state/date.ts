let currentDate: Date | undefined = undefined

export const setSystemTime = (date: Date) => {
  currentDate = date
}

export const resetSystemTime = () => {
  currentDate = undefined
}

/** Wrapper module for Date constructor to make it easier to mock in tests */
export const newDate = (arg?: string | number | Date): Date => {
  if (typeof arg !== 'undefined') return new Date(arg)
  if (currentDate) return currentDate
  return new Date()
}

/** Returns in Unix time, which is seconds since 01/01/1970 */
export const toUnixTime = (date: Date) => Math.round(date.getTime() / 1000)
