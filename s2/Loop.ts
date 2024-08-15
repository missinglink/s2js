import type { Angle } from '../s1/angle'
import { getFrame, Matrix3x3 } from './matrix3x3'
import { Point } from './Point'

/**
 * Loop represents a simple spherical polygon. It consists of a sequence
 * of vertices where the first vertex is implicitly connected to the
 * last. All loops are defined to have a CCW orientation, i.e. the interior of
 * the loop is on the left side of the edges. This implies that a clockwise
 * loop enclosing a small area is interpreted to be a CCW loop enclosing a
 * very large area.
 *
 * Loops are not allowed to have any duplicate vertices (whether adjacent or
 * not).  Non-adjacent edges are not allowed to intersect, and furthermore edges
 * of length 180 degrees are not allowed (i.e., adjacent vertices cannot be
 * antipodal). Loops must have at least 3 vertices (except for the "empty" and
 * "full" loops discussed below).
 *
 * There are two special loops: the "empty" loop contains no points and the
 * "full" loop contains all points. These loops do not have any edges, but to
 * preserve the invariant that every loop can be represented as a vertex
 * chain, they are defined as having exactly one vertex each (see EmptyLoop
 * and FullLoop).
 *
 * @beta incomplete
 */
export class Loop {
  vertices: Point[]

  constructor(pts: Point[]) {
    this.vertices = pts
  }

  vertex(i: number): Point {
    return this.vertices[i % this.vertices.length]
  }

  static regularLoop(center: Point, radius: Angle, numVertices: number): Loop {
    return Loop.regularLoopForFrame(getFrame(center), radius, numVertices)
  }

  static regularLoopForFrame(frame: Matrix3x3, radius: Angle, numVertices: number): Loop {
    return new Loop(Point.regularPointsForFrame(frame, radius, numVertices))
  }
}
