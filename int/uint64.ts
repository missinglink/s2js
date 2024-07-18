import type { uint8 } from './uint8'

/**
 * @module uint64
 *
 * 64-bit integer manipulation/conversion methods
 */

/**
 * valid returns false if i is the wrong type or exceeds 64 bits
 */
export const valid = (i: bigint): boolean => {
  return typeof i === 'bigint' && BigInt.asUintN(64, i) == i
}

/**
 * byte returns the byte at offset n (left-to-right)
 */
export const byte = (i: bigint, o: offset): uint8 => {
  const offset = BigInt((7 - o) * 8)
  const mask = 0b11111111n << offset
  return Number((i & mask) >> offset) as uint8
}

/**
 * trailingZeros8 returns the number of trailing zero bits in byte
 */
const trailingZeros8 = (byte: uint8): number => {
  const lsb = byte & -byte
  if (lsb === 0) return 8
  return 31 - Math.clz32(lsb)
}

/**
 * trailingZeros returns the number of trailing zero bits in an uint64
 */
export const trailingZeros = (i: bigint): position => {
  for (let n = 7; n >= 0; n--) {
    const z = trailingZeros8(byte(i, n as offset))
    if (z < 8) return ((7 - n) * 8 + z) as position
  }
  return 64 as position
}

/**
 * flip flip the bit at position p in uint64
 */
export const flip = (i: bigint, p: position): bigint => {
  return i ^ (1n << BigInt(p))
}

/**
 * set sets the bit at position p in uint64 to v
 */
export const set = (i: bigint, p: position, v: bit): bigint => {
  const mask = 1n << BigInt(p)
  return v ? i | mask : i & ~mask
}

/**
 * setTrailingBits fills the rightmost n bits in uint64 with v
 */
export const setTrailingBits = (i: bigint, p: position, v: bit): bigint => {
  const mask = (1n << BigInt(p + 1)) - 1n
  return v ? i | mask : i & ~mask
}

/**
 * lsb returns the least significant bit that is set
 */
export const lsb = (i: bigint) => i & -i

/**
 * marshal writes an uint64 to an Uint8Array
 */
export const marshal = (i: bigint): Uint8Array => {
  const arr = new Uint8Array(8)
  new DataView(arr.buffer, 0, 8).setBigUint64(0, i, false)
  return arr
}

/**
 * unmarshal reads an uint64 from an Uint8Array
 */
export const unmarshal = (arr: Uint8Array): bigint => {
  return new DataView(arr.buffer, 0, 8).getBigUint64(0, false)
}

/**
 * toBinaryString returns the binary string representation of an uint64
 */
export const toBinaryString = (i: bigint): string => i.toString(2).padStart(64, '0')

/**
 * Types
 */

/** bit value */
export type bit = 0 | 1

/** byte offset */
export type offset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** bit position */
export type position =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60
  | 61
  | 62
  | 63
