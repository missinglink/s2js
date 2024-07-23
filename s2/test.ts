import type { Matrix3x3 } from './matrix3x3'
import * as matrix from './matrix3x3'
import { Point } from './Point'

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

// randomPoint returns a random unit-length vector.
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

// randomFrame returns a right-handed coordinate frame (three orthonormal vectors) for
// a randomly generated point.
export const randomFrame = (): Matrix3x3 => randomFrameAtPoint(randomPoint())
