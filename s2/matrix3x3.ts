import { Vector } from '../r3/Vector'

/**
 * Represents a traditional 3x3 matrix of floating point values.
 * This is not a full-fledged matrix. It only contains the pieces needed
 * to satisfy the computations done within the s2 package.
 */
export type Matrix3x3 = number[][]

/**
 * Returns the given column as a Point.
 */
export const col = (m: Matrix3x3, col: number): Vector => {
  return new Vector(m[0][col], m[1][col], m[2][col])
}

/**
 * Returns the given row as a Point.
 */
export const row = (m: Matrix3x3, row: number): Vector => {
  return new Vector(m[row][0], m[row][1], m[row][2])
}

/**
 * Sets the specified column to the value in the given Point.
 */
export const setCol = (m: Matrix3x3, col: number, v: Vector): Matrix3x3 => {
  m[0][col] = v.x
  m[1][col] = v.y
  m[2][col] = v.z
  return m
}

/**
 * Sets the specified row to the value in the given Point.
 */
export const setRow = (m: Matrix3x3, row: number, v: Vector): Matrix3x3 => {
  m[row][0] = v.x
  m[row][1] = v.y
  m[row][2] = v.z
  return m
}

/**
 * Multiplies the matrix by the given value.
 */
export const scale = (m: Matrix3x3, f: number): Matrix3x3 => {
  return [
    [f * m[0][0], f * m[0][1], f * m[0][2]],
    [f * m[1][0], f * m[1][1], f * m[1][2]],
    [f * m[2][0], f * m[2][1], f * m[2][2]]
  ]
}

/**
 * Returns the multiplication of m by the Point p and converts the
 * resulting 1x3 matrix into a Point.
 */
export const mul = (m: Matrix3x3, v: Vector): Vector => {
  return new Vector(
    m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z
  )
}

/**
 * Returns the determinant of this matrix.
 */
export const det = (m: Matrix3x3): number => {
  //      | a  b  c |
  //  det | d  e  f | = aei + bfg + cdh - ceg - bdi - afh
  //      | g  h  i |
  return (
    m[0][0] * m[1][1] * m[2][2] +
    m[0][1] * m[1][2] * m[2][0] +
    m[0][2] * m[1][0] * m[2][1] -
    m[0][2] * m[1][1] * m[2][0] -
    m[0][1] * m[1][0] * m[2][2] -
    m[0][0] * m[1][2] * m[2][1]
  )
}

/**
 * Reflects the matrix along its diagonal and returns the result.
 */
export const transpose = (m: Matrix3x3): Matrix3x3 => {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]]
  ]
}

/**
 * Formats the matrix into an easier to read layout.
 */
export const toString = (m: Matrix3x3): string => {
  return (
    `[ ${m[0][0].toFixed(4)} ${m[0][1].toFixed(4)} ${m[0][2].toFixed(4)} ] ` +
    `[ ${m[1][0].toFixed(4)} ${m[1][1].toFixed(4)} ${m[1][2].toFixed(4)} ] ` +
    `[ ${m[2][0].toFixed(4)} ${m[2][1].toFixed(4)} ${m[2][2].toFixed(4)} ]`
  )
}

/**
 * Returns the orthonormal frame for the given point on the unit sphere.
 */
export const getFrame = (v: Vector): Matrix3x3 => {
  // Given the point p on the unit sphere, extend this into a right-handed
  // coordinate frame of unit-length column vectors m = (x,y,z). Note that
  // the vectors (x,y) are an orthonormal frame for the tangent space at point p,
  // while p itself is an orthonormal frame for the normal space at p.
  const m: Matrix3x3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
  setCol(m, 2, v)
  setCol(m, 1, v.ortho(new Vector(0.012, 0.0053, 0.00457))) // emulates Point.ortho()
  setCol(m, 0, col(m, 1).cross(v))
  return m
}

/**
 * Returns the coordinates of the given point with respect to its orthonormal basis m.
 * The resulting point q satisfies the identity (m * q == p).
 *
 * The inverse of an orthonormal matrix is its transpose.
 */
export const toFrame = (m: Matrix3x3, v: Vector): Vector => mul(transpose(m), v)

/**
 * Returns the coordinates of the given point in standard axis-aligned basis
 * from its orthonormal basis m.
 * The resulting point p satisfies the identity (p == m * q).
 */
export const fromFrame = (m: Matrix3x3, q: Vector): Vector => mul(m, q)
