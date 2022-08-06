const cos = Math.cos
const sin = Math.sin
const pi = Math.PI

/** Generates a regular hexagon oriented such that one side is flat down */
export function createHexagon(r: number): [number, number][] {
  const points: [number, number][] = [
    [1, 0],
    [cos(pi / 3), sin(pi / 3)],
    [cos((2 * pi) / 3), sin((2 * pi) / 3)],
    [-1, 0],
    [cos((4 * pi) / 3), sin((4 * pi) / 3)],
    [cos((5 * pi) / 3), sin((5 * pi) / 3)],
  ]

  // Scale
  points.forEach((p) => {
    p[0] *= r
    p[1] *= r
  })

  // TODO: translate

  return points
}
