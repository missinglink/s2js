/** clampInt returns the number closest to x within the range min..max. */
export const clampInt = <T extends number | bigint>(x: T, min: T, max: T): T => {
  if (x < min) return min
  if (x > max) return max
  return x
}
