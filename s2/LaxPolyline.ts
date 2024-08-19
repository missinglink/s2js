import { Point } from './Point'
import { Polyline } from './Polyline'
import type { Shape, TypeTag } from './Shape'
import {
  Chain,
  ChainPosition,
  defaultShapeIsEmpty,
  defaultShapeIsFull,
  Edge,
  originReferencePoint,
  ReferencePoint,
  TypeTagLaxPolygon
} from './Shape'

/**
 * LaxPolyline represents a polyline. It is similar to Polyline except
 * that adjacent vertices are allowed to be identical or antipodal, and
 * the representation is slightly more compact.
 *
 * Polylines may have any number of vertices, but note that polylines with
 * fewer than 2 vertices do not define any edges. (To create a polyline
 * consisting of a single degenerate edge, either repeat the same vertex twice
 * or use LaxClosedPolyline).
 */
export class LaxPolyline implements Shape {
  vertices: Point[]

  /**
   * Constructs a LaxPolyline from the given points.
   * @category Constructors
   */
  constructor(vertices: Point[]) {
    this.vertices = [...vertices]
  }

  /**
   * Converts the given Polyline into a LaxPolyline.
   * @category Constructors
   */
  static fromPolyline(p: Polyline): LaxPolyline {
    return new LaxPolyline(p.points)
  }

  numEdges(): number {
    return Math.max(0, this.vertices.length - 1)
  }

  edge(e: number): Edge {
    return new Edge(this.vertices[e], this.vertices[e + 1])
  }

  referencePoint(): ReferencePoint {
    return originReferencePoint(false)
  }

  numChains(): number {
    return Math.min(1, this.numEdges())
  }

  chain(_i: number): Chain {
    return new Chain(0, this.numEdges())
  }

  chainEdge(_i: number, j: number): Edge {
    return new Edge(this.vertices[j], this.vertices[j + 1])
  }

  chainPosition(e: number): ChainPosition {
    return new ChainPosition(0, e)
  }

  dimension(): number {
    return 1
  }

  isEmpty(): boolean {
    return defaultShapeIsEmpty(this)
  }

  isFull(): boolean {
    return defaultShapeIsFull(this)
  }

  typeTag(): TypeTag {
    return TypeTagLaxPolygon
  }

  privateInterface() {}
}
