import { float64Near } from '../r1/math'
import { MAX_LEVEL, NUM_FACES, POS_BITS } from './cellid_constants'
import type { Matrix3x3 } from './matrix3x3'
import * as matrix from './matrix3x3'
import { Point } from './Point'
import * as cellid from './cellid'
import type { CellID } from './cellid'
import { Rect } from './Rect'
import { Cap } from './Cap'

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
    [0, 0, 0]
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

/** Reports whether the two values are within the default epsilon. */
export const float64Eq = (x: number, y: number): boolean => {
  return float64Near(x, y, 1e-10) /** Set a default epsilon value */
}

/**
 * Returns true IFF all vectors in both points are within epsilon distance of each other.
 */
export const pointsNear = (a: Point, b: Point): boolean => {
  return float64Near(a.x, b.x) && float64Near(a.y, b.y) && float64Near(a.y, b.y)
}

/**
 * Reports whether the two points are within the given distance of each other.
 * This is the same as Point.approxEqual but permits specifying the epsilon.
 */
export const pointsApproxEqual = (a: Point, b: Point, epsilon: number): boolean => {
  return a.vector.angle(b.vector) <= epsilon
}

/** Returns a uniformly distributed integer in the range [0,n). */
export const randomUniformInt = (n: number): number => {
  return Math.floor(Math.random() * n)
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
 * The distribution is uniform over the space of cell ids, but only approximately uniform over the surface of the sphere.
 */
export const randomCellIDForLevel = (level: number): CellID => {
  const face = randomUniformInt(NUM_FACES)
  const pos = randomUint64() & ((1n << BigInt(POS_BITS)) - 1n)
  return cellid.fromFacePosLevel(face, pos, level)
}

/**
 * Returns a random CellID at a randomly chosen level.
 * The distribution is uniform over the space of cell ids, but only approximately uniform over the surface of the sphere.
 */
export const randomCellID = (): CellID => {
  return randomCellIDForLevel(randomUniformInt(MAX_LEVEL + 1))
}

/** Returns true with a probability of 1/n. */
export const oneIn = (n: number): boolean => {
  return randomUniformInt(n) == 0
}

/**
 * Reports whether the two rectangles are within the given tolerances
 * at each corner from each other. The tolerances are specific to each axis.
 */
export const rectsApproxEqual = (a: Rect, b: Rect, tolLat: number, tolLng: number): boolean => {
  return (
    Math.abs(a.lat.lo - b.lat.lo) < tolLat &&
    Math.abs(a.lat.hi - b.lat.hi) < tolLat &&
    Math.abs(a.lng.lo - b.lng.lo) < tolLng &&
    Math.abs(a.lng.hi - b.lng.hi) < tolLng
  )
}

/**
 * Returns a cap with a random axis such that the log of its area is
 * uniformly distributed between the logs of the two given values.
 * The log of the cap angle is also approximately uniformly distributed.
 */
export const randomCap = (minArea: number, maxArea: number): Cap => {
  const capArea = maxArea * Math.pow(minArea / maxArea, randomFloat64())
  return Cap.fromCenterArea(randomPoint(), capArea)
}
