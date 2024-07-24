import { float64Near } from '../r1/math'
import { MAX_LEVEL, NUM_FACES, POS_BITS } from './cellid_constants'
import type { Matrix3x3 } from './matrix3x3'
import * as matrix from './matrix3x3'
import { Point } from './Point'
import * as cellid from './cellid'
import type { CellID } from './cellid'

/** The Earth's mean radius in kilometers (according to NASA). */
export const EARTH_RADIUS_KM = 6371.01

/**
 * Returns a uniformly distributed value in the range [0,1).
 */
export const randomFloat64 = (): number => Math.random()

/**
 * Returns a uniformly distributed value in the range [min, max).
 */
export const randomUniformFloat64 = (min: number, max: number): number => {
  return min + randomFloat64() * (max - min)
}

// Returns a random unit-length vector.
export const randomPoint = (): Point => {
  return Point.fromCoords(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
}

/**
 * Returns a right-handed coordinate frame using the given point as the z-axis.
 */
export const randomFrameAtPoint = (z: Point): Matrix3x3 => {
  const x = Point.fromVector(z.vector.cross(randomPoint().vector).normalize())
  const y = Point.fromVector(z.vector.cross(x.vector).normalize())
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  matrix.setCol(m, 0, x)
  matrix.setCol(m, 1, y)
  matrix.setCol(m, 2, z)
  return m
}

/**
 * Returns a right-handed coordinate frame (three orthonormal vectors) for a randomly generated point.
 */
export const randomFrame = (): Matrix3x3 => randomFrameAtPoint(randomPoint())

/**
 * Returns true IFF all vectors in both points are within epsilon distance of each other.
 */
export const pointsNear = (a: Point, b: Point): boolean => {
  return float64Near(a.x, b.x) && float64Near(a.y, b.y) && float64Near(a.y, b.y)
}

/** Returns a uniformly distributed integer in the range [0,n). */
export const randomUniformInt = (n: number): number => {
  return Math.abs(Math.floor(randomFloat64() * n))
}

/** Returns a random hex string of length chars. */
const randomHexString = (length: number): string => {
  return Array.from({ length }, () => Math.round(Math.random() * 0xf).toString(16)).join('')
}

/** Returns a random BigInt of n bits in length. */
export const randomBigIntN = (n: number): bigint => {
  return BigInt.asUintN(n, BigInt(`0x${randomHexString(Math.ceil(n / 4))}`))
}

/** Returns a uniformly distributed 32-bit unsigned integer. */
export const randomUint32 = (): number => Number(randomBigIntN(32))

/** Returns a uniformly distributed 64-bit unsigned integer. */
export const randomUint64 = (): bigint => randomBigIntN(64)

/**
 * Returns a random CellID at the given level.
 * The distribution is uniform over the space of cell ids, but only
 * approximately uniform over the surface of the sphere.
 */
export const randomCellIDForLevel = (level: number): CellID => {
  const face = randomUniformInt(NUM_FACES)
  const pos = randomBigIntN(POS_BITS) | (level === MAX_LEVEL ? 0n : 1n)
  return cellid.fromFacePosLevel(face, pos, level)
}
