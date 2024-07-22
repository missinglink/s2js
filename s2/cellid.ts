import { findLSBSetNonZero64 } from '../r1/math'
import { FACE_BITS, MAX_LEVEL, NUM_FACES, POS_BITS } from './cellid_constants'

export type CellID = bigint

/**
 * Returns the cube face for this cell id, in the range [0,5].
 */
export const face = (ci: CellID): number => {
  return Number(ci >> BigInt(POS_BITS))
}

/**
 * Returns the position along the Hilbert curve of this cell id, in the range [0,2^POS_BITS-1].
 */
export const pos = (ci: CellID): CellID => {
  return ci & (~0n >> BigInt(FACE_BITS))
}

/**
 * Returns the subdivision level of this cell id, in the range [0, MAX_LEVEL].
 */
export const level = (ci: CellID): number => {
  return MAX_LEVEL - (findLSBSetNonZero64(ci) >>> 1)
}

/**
 * Returns the cell id at the given level, which must be no greater than the current level.
 */
export const parent = (ci: CellID, level: number): CellID => {
  const lsb = lsbForLevel(level)
  return (ci & -lsb) | lsb
}

/**
 * Returns true is cell id is valid.
 */
export const valid = (ci: CellID): boolean => {
  if (typeof ci !== 'bigint' || BigInt.asUintN(64, ci) != ci) return false
  return face(ci) <= NUM_FACES && (lsb(ci) & 0x1555555555555555n) != 0n
}

// Bitwise

/**
 * Returns the least significant bit that is set
 */
const lsb = (ci: CellID) => ci & -ci

/**
 * Returns the lowest-numbered bit that is on for cells at the given level.
 */
const lsbForLevel = (level: number): CellID => {
  return 1n << BigInt(2 * (MAX_LEVEL - level))
}

// Ranges

/**
 * Returns the minimum CellID that is contained within this cell.
 */
export const rangeMin = (ci: CellID) => {
  return ci - (lsb(ci) - 1n)
}

/**
 * Returns the maximum CellID that is contained within this cell.
 */
export const rangeMax = (ci: CellID): CellID => {
  return ci + (lsb(ci) - 1n)
}

/**
 * Returns true iff ci contains oci.
 */
export const contains = (ci: CellID, oci: CellID) => {
  return ci !== oci && rangeMin(ci) <= oci && oci <= rangeMax(ci)
}

/**
 * Returns true iff ci intersects oci.
 */
export const intersects = (ci: CellID, oci: CellID) => {
  return rangeMin(oci) <= rangeMax(ci) && rangeMax(oci) >= rangeMin(ci)
}

// Token

/**
 * Returns a hex-encoded string of the uint64 cell id, with leading zeros included but trailing zeros stripped
 */
export const toToken = (ci: CellID): string => {
  const s = ci.toString(16).replace(/0+$/, '')
  if (s.length === 0) return 'X'
  return s
}

/**
 * Returns a cell id given a hex-encoded string.
 * @category Constructors
 */
export const fromToken = (t: string): CellID => {
  if (t.length > 16) return 0n
  let ci = BigInt('0x' + t)
  if (t.length < 16) ci = ci << BigInt(4 * (16 - t.length))
  return ci
}

// Constructors

/**
 * Returns a cell id given its face in the range [0,5], the 61-bit Hilbert curve position pos within that face, and the level in the range [0,MAX_LEVEL].
 * The position in the cell id will be truncated to correspond to the Hilbert curve position at the center of the returned cell.
 * @category Constructors
 */
export const fromFacePosLevel = (face: number, pos: number, level: number): CellID => {
  return parent((BigInt(face) << BigInt(POS_BITS)) + BigInt(pos || 1), level)
}
