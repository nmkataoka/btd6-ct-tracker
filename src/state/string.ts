/** Adds spaces to the end of a string for consistent formatting in monospaced code blocks */
export function pad(s: string | number, len: number, padFront = false) {
  let val = s + ''
  let spaces = ''
  for (let i = 0; i < Math.max(0, len - val.length); ++i) {
    spaces += ' '
  }
  if (padFront) {
    return spaces + val
  }
  return val + spaces
}
