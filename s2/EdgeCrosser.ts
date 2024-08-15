import { CROSS, Crossing, DO_NOT_CROSS, MAYBE_CROSS } from './edge_crossings'
import { DBL_EPSILON, expensiveSign, INDETERMINATE, robustSign, triageSign } from './predicates'
import type { Direction } from './predicates'
import { Point } from './Point'

/**
 * EdgeCrosser allows edges to be efficiently tested for intersection with a
 * given fixed edge AB. It is especially efficient when testing for
 * intersection with an edge chain connecting vertices v0, v1, v2, ...
 *
 * Example usage:
 *
 * ```
 * function countIntersections(a: Point, b: Point, edges: Edge[]): number {
 *   let count = 0;
 *   const crosser = newEdgeCrosser(a, b);
 *   for (const edge of edges) {
 *     if (crosser.crossingSign(edge.first, edge.second) !== DO_NOT_CROSS) {
 *       count++;
 *     }
 *   }
 *   return count;
 * }
 * ```
 * @beta incomplete
 */
export class EdgeCrosser {
  a: Point
  b: Point
  aXb: Point
  aTangent: Point
  bTangent: Point
  c: Point
  acb: Direction

  /**
   * Returns an EdgeCrosser with the fixed edge AB.
   *
   * @category Constructors
   */
  constructor(a: Point, b: Point) {
    const norm = a.pointCross(b)
    this.a = a
    this.b = b
    this.aXb = Point.fromVector(a.vector.cross(b.vector))
    this.aTangent = Point.fromVector(a.vector.cross(norm.vector))
    this.bTangent = Point.fromVector(norm.vector.cross(b.vector))
    this.c = new Point(0, 0, 0)
    this.acb = CROSS
  }

  /**
   * A convenience constructor that uses AB as the fixed edge,
   * and C as the first vertex of the vertex chain (equivalent to calling restartAt(c)).
   *
   * You don't need to use this or any of the chain functions unless you're trying to
   * squeeze out every last drop of performance. Essentially all you are saving is a test
   * whether the first vertex of the current edge is the same as the second vertex of the
   * previous edge.
   *
   * @category Constructors
   */
  static newChainEdgeCrosser(a: Point, b: Point, c: Point): EdgeCrosser {
    const e = new EdgeCrosser(a, b)
    e.restartAt(c)
    return e
  }

  /**
   * Reports whether the edge AB intersects the edge CD. If any two
   * vertices from different edges are the same, returns MAYBE_CROSS. If either edge
   * is degenerate (A == B or C == D), returns either DO_NOT_CROSS or MAYBE_CROSS.
   *
   * Properties of crossingSign:
   * (1) crossingSign(b,a,c,d) == crossingSign(a,b,c,d)
   * (2) crossingSign(c,d,a,b) == crossingSign(a,b,c,d)
   * (3) crossingSign(a,b,c,d) == MAYBE_CROSS if a==c, a==d, b==c, b==d
   * (3) crossingSign(a,b,c,d) == DO_NOT_CROSS or MAYBE_CROSS if a==b or c==d
   *
   * Note that if you want to check an edge against a chain of other edges,
   * it is slightly more efficient to use the single-argument version
   * chainCrossingSign below.
   */
  crossingSign(c: Point, d: Point): Crossing {
    if (c !== this.c) this.restartAt(c)
    return this.chainCrossingSign(d)
  }

  /**
   * Sets the current point of the edge crosser to be c.
   * Call this method when your chain 'jumps' to a new place.
   * The argument must point to a value that persists until the next call.
   */
  restartAt(c: Point): void {
    this.c = c
    this.acb = -triageSign(this.a, this.b, this.c)
  }

  /**
   * Like crossingSign, but uses the last vertex passed to one of
   * the crossing methods (or restartAt) as the first vertex of the current edge.
   */
  chainCrossingSign(d: Point): Crossing {
    const bda = triageSign(this.a, this.b, d)
    if (this.acb === -bda && bda !== INDETERMINATE) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }
    return this.crossingSignHelper(d, bda)
  }

  /**
   * Handle the slow path of crossingSign.
   */
  private crossingSignHelper(d: Point, bda: Direction): Crossing {
    const maxError = (1.5 + 1 / Math.sqrt(3)) * DBL_EPSILON
    if (
      (this.c.vector.dot(this.aTangent.vector) > maxError && d.vector.dot(this.aTangent.vector) > maxError) ||
      (this.c.vector.dot(this.bTangent.vector) > maxError && d.vector.dot(this.bTangent.vector) > maxError)
    ) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }

    if (this.a === this.c || this.a === d || this.b === this.c || this.b === d) {
      this.c = d
      this.acb = -bda
      return MAYBE_CROSS
    }

    if (this.a === this.b || this.c === d) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }

    if (this.acb === INDETERMINATE) this.acb = -expensiveSign(this.a, this.b, this.c)
    if (bda === INDETERMINATE) bda = expensiveSign(this.a, this.b, d)

    if (bda !== this.acb) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }

    const cbd = -robustSign(this.c, d, this.b)
    if (cbd !== this.acb) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }

    const dac = robustSign(this.c, d, this.a)
    if (dac !== this.acb) {
      this.c = d
      this.acb = -bda
      return DO_NOT_CROSS
    }

    this.c = d
    this.acb = -bda
    return CROSS
  }
}
