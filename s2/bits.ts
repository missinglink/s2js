/**
 * Returns the number of trailing zero bits in a bigint.
 */
export const findLSBSetNonZero64 = (i: bigint): number => {
  const lsb = i & -i & 0xffffffffffffffffn
  if (lsb === 0n) return 64
  const lo = Math.clz32(Number(lsb & 0xffffffffn))
  if (lo < 32) return 31 - lo
  const hi = Math.clz32(Number((lsb >> 32n) & 0xffffffffn))
  return 63 - hi
}
