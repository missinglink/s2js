import { Vector } from '../r3/Vector'
import { LatLng } from './LatLng'
import { EPSILON } from './predicates'

/**
 * Point represents a point on the unit sphere as a normalized 3D vector.
 * Fields should be treated as read-only. Use one of the factory methods for creation.
 *
 * @beta incomplete
 */
export class Point {
  vector: Vector

  /**
   * Returns a new Point.
   * @category Constructors
   */
  constructor(x: number, y: number, z: number) {
    this.vector = new Vector(x, y, z)
  }

  /**
   * Returns the x dimension value.
   */
  get x(): number {
    return this.vector.x
  }

  /**
   * Returns the y dimension value.
   */
  get y(): number {
    return this.vector.y
  }

  /**
   * Returns the z dimension value.
   */
  get z(): number {
    return this.vector.z
  }

  /**
   * Point represents a point on the unit sphere as a normalized 3D vector.
   * Fields should be treated as read-only. Use one of the factory methods for creation.
   * @category Constructors
   */
  static fromVector(vector: Vector) {
    return new Point(vector.x, vector.y, vector.z)
  }

  /**
   * Returns a Point for the given LatLng.
   * @category Constructors
   */
  static fromLatLng(ll: LatLng): Point {
    const phi = ll.lat
    const theta = ll.lng
    const cosphi = Math.cos(phi)
    return new Point(Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi))
  }

  /**
   * Creates a new normalized point from coordinates.
   *
   * This always returns a valid point. If the given coordinates can not be normalized
   * the origin point will be returned.
   *
   * This behavior is different from the C++ construction of a S2Point from coordinates
   * (i.e. S2Point(x, y, z)) in that in C++ they do not Normalize.
   * @category Constructors
   */
  static fromCoords(x: number, y: number, z: number): Point {
    if (x === 0 && y === 0 && z === 0) return this.originPoint()
    return Point.fromVector(new Vector(x, y, z).normalize())
  }

  /**
   * Returns a unique "origin" on the sphere for operations that need a fixed
   * reference point. In particular, this is the "point at infinity" used for
   * point-in-polygon testing (by counting the number of edge crossings).
   *
   * It should *not* be a point that is commonly used in edge tests in order
   * to avoid triggering code to handle degenerate cases (this rules out the
   * north and south poles). It should also not be on the boundary of any
   * low-level S2Cell for the same reason.
   * @category Constructors
   */
  static originPoint(): Point {
    return new Point(-0.0099994664350250197, 0.0025924542609324121, 0.99994664350250195)
  }

  /**
   * Reports whether this point is similar enough to be equal to another point.
   */
  approxEqual(other: Point): boolean {
    return this.vector.angle(other.vector) <= EPSILON
  }

  /**
   * Returns a unit-length vector that is orthogonal to this point.
   * Satisfies Ortho(-a) = -Ortho(a) for all a.
   *
   * Note that Vector3 also defines an "Ortho" method, but this one is
   * preferred for use in S2 code because it explicitly tries to avoid result
   * coordinates that are zero. (This is a performance optimization that
   * reduces the amount of time spent in functions that handle degeneracies.)
   */
  static ortho(a: Point): Point {
    const lc = a.vector.largestComponent()
    const op = new Vector(0.012, 0.0053, 0.00457)

    if (lc === Vector.X_AXIS) op.z = 1
    else if (lc === Vector.Y_AXIS) op.x = 1
    else op.y = 1

    return Point.fromVector(a.vector.cross(op).normalize())
  }
}
