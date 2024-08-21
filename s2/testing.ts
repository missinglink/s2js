import { float64Near } from '../r1/math'
import { MAX_LEVEL, NUM_FACES, POS_BITS } from './cellid_constants'
import type { Matrix3x3 } from './matrix3x3'
import * as matrix from './matrix3x3'
import { Point } from './Point'
import { Point as R2Point } from '../r2/Point'
import * as cellid from './cellid'
import type { CellID } from './cellid'
import { Rect } from './Rect'
import { Cap } from './Cap'
import { DBL_EPSILON, EPSILON } from './predicates'
import type { Angle } from '../s1/angle'
import { Loop } from './Loop'
import { Polygon } from './Polygon'

/** The Earth's mean radius in kilometers (according to NASA). */
export const EARTH_RADIUS_KM = 6371.01

// kmToAngle converts a distance on the Earth's surface to an angle.
export const kmToAngle = (km: number): Angle => km / EARTH_RADIUS_KM

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
  return BigInt.asUintN(n, BigInt(`0x${randomHexString(Math.ceil(n / 4))}`)) & ((1n << BigInt(n)) - 1n)
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

/**
 * Returns a point chosen uniformly at random (with respect to area) from the given cap.
 */
export const samplePointFromCap = (c: Cap): Point => {
  // We consider the cap axis to be the "z" axis. We choose two other axes to
  // complete the coordinate frame.
  const m = matrix.getFrame(c.center)

  // The surface area of a spherical cap is directly proportional to its height.
  // First, we choose a random height, and then we choose a random point along the circle at that height.
  const h = randomFloat64() * c.height()
  const theta = 2 * Math.PI * randomFloat64()
  const r = Math.sqrt(h * (2 - h))

  // The result should already be very close to unit-length, but we might as
  // well make it as accurate as possible.
  return Point.fromVector(
    matrix.fromFrame(m, Point.fromCoords(Math.cos(theta) * r, Math.sin(theta) * r, 1 - h)).vector.normalize()
  )
}

/** Returns true with a probability of 1/n. */
export const oneIn = (n: number): boolean => {
  return randomUniformInt(n) == 0
}

export const RECT_ERROR_LAT = 10 * DBL_EPSILON
export const RECT_ERROR_LNG = DBL_EPSILON

/**
 * Reports whether the two rectangles are within the given tolerances
 * at each corner from each other. The tolerances are specific to each axis.
 */
export const rectsApproxEqual = (a: Rect, b: Rect, tolLat: number = EPSILON, tolLng: number = EPSILON): boolean => {
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

/**
 * Returns a number in the range [0, 2^maxLog - 1] with bias towards smaller numbers.
 *
 * missinglink: is this biased?
 */
export const skewedInt = (maxLog: number): number => {
  const base = Math.floor(Math.random() * (maxLog + 1))
  return Number(randomBigIntN(31)) & ((1 << base) - 1)
}

/**
 * Reports whether the two points are within the given epsilon.
 */
export const r2PointsApproxEqual = (a: R2Point, b: R2Point, epsilon: number = EPSILON): boolean => {
  return float64Near(a.x, b.x, epsilon) && float64Near(a.y, b.y, epsilon)
}

/**
 * Returns a Point from a line segment whose endpoints are difficult to handle correctly.
 * Given two adjacent cube vertices P and Q, it returns either an edge midpoint, face midpoint,
 * or corner vertex that is in the plane of PQ and that has been perturbed slightly.
 * It also sometimes returns a random point from anywhere on the sphere.
 */
export const perturbedCornerOrMidpoint = (p: Point, q: Point): Point => {
  let a = p.vector.mul(randomUniformInt(3) - 1).add(q.vector.mul(randomUniformInt(3) - 1))

  if (oneIn(10)) {
    a = a.add(randomPoint().vector.mul(Math.pow(1e-300, randomFloat64())))
  } else if (oneIn(2)) {
    a = a.add(randomPoint().vector.mul(4 * DBL_EPSILON))
  } else {
    a = a.add(randomPoint().vector.mul(1e-10 * Math.pow(1e-15, randomFloat64())))
  }

  if (a.norm2() < Number.MIN_VALUE) {
    return perturbedCornerOrMidpoint(p, q)
  }

  return Point.fromVector(a)
}

/**
 * Constructs a polygon with the specified center as a
 * number of concentric loops and vertices per loop.
 */
export const concentricLoopsPolygon = (center: Point, numLoops: number, verticesPerLoop: number): Polygon => {
  const loops: Loop[] = []

  for (let li = 0; li < numLoops; li++) {
    const radius = (0.005 * (li + 1)) / numLoops
    loops.push(Loop.regularLoop(Point.fromVector(center.vector), radius, verticesPerLoop))
  }

  return Polygon.fromLoops(loops)
}
