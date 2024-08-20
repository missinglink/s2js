import type { Angle } from '../s1/angle'
import { Cell } from './Cell'
import { angleContainsVertex } from './edge_crossings'
import { EdgeCrosser } from './EdgeCrosser'
import { getFrame, Matrix3x3 } from './matrix3x3'
import { Point } from './Point'
import { Rect } from './Rect'
import { RectBounder } from './RectBounder'
import { ShapeIndex } from './ShapeIndex'
import { ShapeIndexIterator } from './ShapeIndexIterator'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import type { ReferencePoint, Shape, TypeTag } from './Shape'
import { Chain, ChainPosition, Edge, originReferencePoint, TypeTagNone } from './Shape'

// These two points are used for the special Empty and Full loops.
const emptyLoopPoint = new Point(0, 0, 1)
const fullLoopPoint = new Point(0, 0, -1)

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
export class Loop implements Shape {
  vertices: Point[]
  originInside: boolean = false
  depth: number = 0
  bound: Rect = Rect.emptyRect()
  subregionBound: Rect = Rect.emptyRect()
  index: ShapeIndex

  /**
   * Returns a new Loop.
   * @category Constructors
   */
  constructor(pts: Point[]) {
    this.vertices = pts
    this.index = new ShapeIndex()
    this.initOriginAndBound()
  }

  /**
   * Creates a new Loop from the given cell.
   * @category Constructors
   */
  static fromCell(c: Cell): Loop {
    const vertices = [c.vertex(0), c.vertex(1), c.vertex(2), c.vertex(3)]
    return new Loop(vertices)
  }

  /**
   * Returns the empty Loop.
   * @category Constructors
   */
  static emptyLoop(): Loop {
    return new Loop([emptyLoopPoint])
  }

  /**
   * Returns the full Loop.
   * @category Constructors
   */
  static fullLoop(): Loop {
    return new Loop([fullLoopPoint])
  }

  initOriginAndBound(): void {
    if (this.vertices.length < 3) {
      if (!this.isEmptyOrFull()) {
        this.originInside = false
        return
      }
      this.originInside = this.vertices[0].z < 0
    } else {
      const v1Inside =
        this.vertices[0] !== this.vertices[1] &&
        this.vertices[2] !== this.vertices[1] &&
        angleContainsVertex(this.vertices[0], this.vertices[1], this.vertices[2])

      this.originInside = false

      if (v1Inside !== this.containsPoint(this.vertices[1])) {
        this.originInside = true
      }
    }

    this.initBound()
    this.index.add(this)
  }

  // missinglink: replaces pointer assignment
  copyFrom(ol: Loop) {
    this.vertices = ol.vertices
    this.originInside = ol.originInside
    this.depth = ol.depth
    this.bound = ol.bound
    this.subregionBound = ol.subregionBound
    this.index = ol.index
  }

  initBound(): void {
    if (this.vertices.length === 0) {
      this.copyFrom(Loop.emptyLoop())
      return
    }

    if (this.isEmptyOrFull()) {
      if (this.isEmpty()) {
        this.bound = Rect.emptyRect()
      } else {
        this.bound = Rect.fullRect()
      }
      this.subregionBound = this.bound
      return
    }

    const bounder = new RectBounder()
    for (let i = 0; i <= this.vertices.length; i++) {
      bounder.addPoint(this.vertex(i))
    }
    let b = bounder.rectBound()

    if (this.containsPoint(new Point(0, 0, 1))) {
      b = new Rect(new R1Interval(b.lat.lo, Math.PI / 2), S1Interval.fullInterval())
    }
    if (b.lng.isFull() && this.containsPoint(new Point(0, 0, -1))) {
      b.lat.lo = -Math.PI / 2
    }
    this.bound = b
    this.subregionBound = RectBounder.expandForSubregions(this.bound)
  }

  validate(): Error | null {
    const err = this.findValidationErrorNoIndex()
    if (err) {
      return err
    }
    return null
  }

  findValidationErrorNoIndex(): Error | null {
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i]
      if (!v.vector.isUnit()) {
        return new Error(`vertex ${i} is not unit length`)
      }
    }

    if (this.vertices.length < 3) {
      if (this.isEmptyOrFull()) {
        return null
      }
      return new Error('non-empty, non-full loops must have at least 3 vertices')
    }

    for (let i = 0; i < this.vertices.length; i++) {
      if (this.vertices[i] === this.vertex(i + 1)) {
        return new Error(`edge ${i} is degenerate (duplicate vertex)`)
      }

      const other = Point.fromVector(this.vertex(i + 1).vector.mul(-1))
      if (this.vertices[i] === other) {
        return new Error(`vertices ${i} and ${(i + 1) % this.vertices.length} are antipodal`)
      }
    }

    return null
  }

  // contains(o: Loop): boolean {
  //   if (!this.subregionBound.contains(o.bound)) {
  //     return false
  //   }

  //   if (this.isEmptyOrFull() || o.isEmptyOrFull()) {
  //     return this.isFull() || o.isEmpty()
  //   }

  //   const relation = new ContainsRelation()
  //   if (hasCrossingRelation(this, o, relation)) {
  //     return false
  //   }

  //   if (relation.foundSharedVertex) {
  //     return true
  //   }

  //   if (!this.containsPoint(o.vertex(0))) {
  //     return false
  //   }

  //   if (
  //     (o.subregionBound.contains(this.bound) || o.bound.union(this.bound).isFull()) &&
  //     o.containsPoint(this.vertex(0))
  //   ) {
  //     return false
  //   }
  //   return true
  // }

  // intersects(o: Loop): boolean {
  //   if (!this.bound.intersects(o.bound)) {
  //     return false
  //   }

  //   const relation = new IntersectsRelation()
  //   if (hasCrossingRelation(this, o, relation)) {
  //     return true
  //   }
  //   if (relation.foundSharedVertex) {
  //     return false
  //   }

  //   if (this.subregionBound.contains(o.bound) || this.bound.union(o.bound).isFull()) {
  //     if (this.containsPoint(o.vertex(0))) {
  //       return true
  //     }
  //   }
  //   if (o.subregionBound.contains(this.bound)) {
  //     if (o.containsPoint(this.vertex(0))) {
  //       return true
  //     }
  //   }
  //   return false
  // }

  // equal(other: Loop): boolean {
  //   if (this.vertices.length !== other.vertices.length) {
  //     return false
  //   }

  //   for (let i = 0; i < this.vertices.length; i++) {
  //     if (this.vertices[i] !== other.vertex(i)) {
  //       return false
  //     }
  //   }
  //   return true
  // }

  // boundaryEqual(o: Loop): boolean {
  //   if (this.vertices.length !== o.vertices.length) {
  //     return false
  //   }

  //   if (this.isEmptyOrFull()) {
  //     return this.isEmpty() === o.isEmpty()
  //   }

  //   for (let offset = 0; offset < this.vertices.length; offset++) {
  //     if (this.vertices[offset] === o.vertex(0)) {
  //       for (let i = 0; i < this.vertices.length; i++) {
  //         if (this.vertex(i + offset) !== o.vertex(i)) {
  //           return false
  //         }
  //       }
  //       return true
  //     }
  //   }
  //   return false
  // }

  // compareBoundary(o: Loop): number {
  //   if (!this.bound.intersects(o.bound)) {
  //     return -1
  //   }

  //   if (this.isFull()) {
  //     return 1
  //   }
  //   if (o.isFull()) {
  //     return -1
  //   }

  //   const relation = new CompareBoundaryRelation(o.isHole())
  //   if (hasCrossingRelation(this, o, relation)) {
  //     return 0
  //   }
  //   if (relation.foundSharedVertex) {
  //     return relation.containsEdge ? 1 : -1
  //   }

  //   if (this.containsPoint(o.vertex(0))) {
  //     return 1
  //   }
  //   return -1
  // }

  containsOrigin(): boolean {
    return this.originInside
  }

  referencePoint(): ReferencePoint {
    return originReferencePoint(this.originInside)
  }

  numEdges(): number {
    return this.isEmptyOrFull() ? 0 : this.vertices.length
  }

  edge(i: number): Edge {
    return new Edge(this.vertex(i), this.vertex(i + 1))
  }

  numChains(): number {
    return this.isEmpty() ? 0 : 1
  }

  chain(_chainID: number): Chain {
    return new Chain(0, this.numEdges())
  }

  chainEdge(_chainID: number, offset: number): Edge {
    return new Edge(this.vertex(offset), this.vertex(offset + 1))
  }

  chainPosition(edgeID: number): ChainPosition {
    return new ChainPosition(0, edgeID)
  }

  dimension(): number {
    return 2
  }

  typeTag(): TypeTag {
    return TypeTagNone
  }

  privateInterface(): void {}

  isEmpty(): boolean {
    return this.isEmptyOrFull() && !this.containsOrigin()
  }

  isFull(): boolean {
    return this.isEmptyOrFull() && this.containsOrigin()
  }

  isEmptyOrFull(): boolean {
    return this.vertices.length === 1
  }

  // vertices(): Point[] {
  //   return this.vertices
  // }

  // rectBound(): Rect {
  //   return this.bound
  // }

  // capBound(): Cap {
  //   return this.bound.capBound()
  // }

  vertex(i: number): Point {
    return this.vertices[i % this.vertices.length]
  }

  // orientedVertex(i: number): Point {
  //   let j = i - this.vertices.length
  //   if (j < 0) {
  //     j = i
  //   }
  //   if (this.isHole()) {
  //     j = this.vertices.length - 1 - j
  //   }
  //   return this.vertex(j)
  // }

  // numVertices(): number {
  //   return this.vertices.length
  // }

  bruteForceContainsPoint(p: Point): boolean {
    const origin = Point.originPoint()
    let inside = this.originInside
    const crosser = EdgeCrosser.newChainEdgeCrosser(origin, p, this.vertex(0))
    for (let i = 1; i <= this.vertices.length; i++) {
      inside = inside !== crosser.edgeOrVertexChainCrossing(this.vertex(i))
    }
    return inside
  }

  containsPoint(p: Point): boolean {
    if (!this.index.isFresh() && !this.bound.containsPoint(p)) {
      return false
    }

    const maxBruteForceVertices = 32
    if (this.index.shapes.size === 0 || this.vertices.length <= maxBruteForceVertices) {
      return this.bruteForceContainsPoint(p)
    }

    const it = this.index.iterator()
    if (!it.locatePoint(p)) {
      return false
    }
    return this.iteratorContainsPoint(it, p)
  }

  // containsCell(target: Cell): boolean {
  //   const it = this.index.iterator()
  //   const relation = it.locateCellID(target.id())

  //   if (relation !== Indexed) {
  //     return false
  //   }

  //   if (this.boundaryApproxIntersects(it, target)) {
  //     return false
  //   }

  //   return this.iteratorContainsPoint(it, target.center())
  // }

  // intersectsCell(target: Cell): boolean {
  //   const it = this.index.iterator()
  //   const relation = it.locateCellID(target.id())

  //   if (relation === Disjoint) {
  //     return false
  //   }
  //   if (relation === Subdivided) {
  //     return true
  //   }
  //   if (it.cellID() === target.id) {
  //     return true
  //   }
  //   if (this.boundaryApproxIntersects(it, target)) {
  //     return true
  //   }
  //   return this.iteratorContainsPoint(it, target.center())
  // }

  // cellUnionBound(): CellID[] {
  //   return this.capBound().cellUnionBound()
  // }

  // boundaryApproxIntersects(it: ShapeIndexIterator, target: Cell): boolean {
  //   const aClipped = it.indexCell().findByShapeID(0)

  //   if (aClipped.edges.length === 0) {
  //     return false
  //   }

  //   if (it.cellID() === target.id()) {
  //     return true
  //   }

  //   const maxError = faceClipErrorUVCoord + intersectsRectErrorUVDist
  //   const bound = target.boundUV().expandedByMargin(maxError)
  //   for (const ai of aClipped.edges) {
  //     const [v0, v1, ok] = ClipToPaddedFace(this.vertex(ai), this.vertex(ai + 1), target.face(), maxError)
  //     if (ok && edgeIntersectsRect(v0, v1, bound)) {
  //       return true
  //     }
  //   }
  //   return false
  // }

  iteratorContainsPoint(it: ShapeIndexIterator, p: Point): boolean {
    const aClipped = it.indexCell()?.findByShapeID(0)
    let inside = aClipped?.containsCenter || false
    if (aClipped && aClipped.edges.length > 0) {
      const center = it.center()
      const crosser = new EdgeCrosser(center, p)
      let aiPrev = -2
      for (const ai of aClipped.edges) {
        if (ai !== aiPrev + 1) {
          crosser.restartAt(this.vertex(ai))
        }
        aiPrev = ai
        inside = inside !== crosser.edgeOrVertexChainCrossing(this.vertex(ai + 1))
      }
    }
    return inside
  }

  static regularLoop(center: Point, radius: Angle, numVertices: number): Loop {
    return Loop.regularLoopForFrame(getFrame(center), radius, numVertices)
  }

  static regularLoopForFrame(frame: Matrix3x3, radius: Angle, numVertices: number): Loop {
    return new Loop(Point.regularPointsForFrame(frame, radius, numVertices))
  }

  //   canonicalFirstVertex(): [number, number] {
  //     let firstIdx = 0
  //     const n = this.vertices.length
  //     for (let i = 1; i < n; i++) {
  //       if (this.vertex(i).cmp(this.vertex(firstIdx).vector) === -1) {
  //         firstIdx = i
  //       }
  //     }

  //     if (this.vertex(firstIdx + 1).cmp(this.vertex(firstIdx + n - 1).vector) === -1) {
  //       return [firstIdx, 1]
  //     }

  //     firstIdx += n
  //     return [firstIdx, -1]
  //   }

  //   turningAngle(): number {
  //     if (this.isEmptyOrFull()) {
  //       return this.containsOrigin() ? -2 * Math.PI : 2 * Math.PI
  //     }

  //     if (this.vertices.length < 3) {
  //       return 0
  //     }

  //     const [i, dir] = this.canonicalFirstVertex()
  //     let sum = TurnAngle(
  //       this.vertex((i + this.vertices.length - dir) % this.vertices.length),
  //       this.vertex(i),
  //       this.vertex((i + dir) % this.vertices.length)
  //     )

  //     let compensation = new Angle(0)
  //     for (let n = this.vertices.length - 1; n > 0; n--) {
  //       i += dir
  //       const angle = TurnAngle(this.vertex(i - dir), this.vertex(i), this.vertex(i + dir))
  //       const oldSum = sum
  //       sum += angle + compensation
  //       compensation = oldSum - sum + angle
  //     }

  //     const maxCurvature = 2 * Math.PI - 4 * dblEpsilon

  //     return Math.max(-maxCurvature, Math.min(maxCurvature, dir * (sum + compensation)))
  //   }

  //   turningAngleMaxError(): number {
  //     const maxErrorPerVertex = 11.25 * dblEpsilon
  //     return maxErrorPerVertex * this.vertices.length
  //   }

  //   isHole(): boolean {
  //     return this.depth & (1 !== 0)
  //   }

  //   sign(): number {
  //     return this.isHole() ? -1 : 1
  //   }

  //   isNormalized(): boolean {
  //     if (this.bound.lng.length() < Math.PI) {
  //       return true
  //     }
  //     return this.turningAngle() >= -this.turningAngleMaxError()
  //   }

  //   normalize(): void {
  //     if (!this.isNormalized()) {
  //       this.invert()
  //     }
  //   }

  //   invert(): void {
  //     this.index.reset()
  //     if (this.isEmptyOrFull()) {
  //       this.vertices[0] = this.isFull() ? emptyLoopPoint : fullLoopPoint
  //     } else {
  //       for (let i = Math.floor(this.vertices.length / 2) - 1; i >= 0; i--) {
  //         const opp = this.vertices.length - 1 - i
  //         ;[this.vertices[i], this.vertices[opp]] = [this.vertices[opp], this.vertices[i]]
  //       }
  //     }

  //     this.originInside = !this.originInside
  //     if (this.bound.lat.lo > -Math.PI / 2 && this.bound.lat.hi < Math.PI / 2) {
  //       this.bound = Rect.fullRect()
  //       this.subregionBound = this.bound
  //     } else {
  //       this.initBound()
  //     }
  //     this.index.add(this)
  //   }

  //   findVertex(p: Point): [number, boolean] {
  //     const notFound = 0
  //     if (this.vertices.length < 10) {
  //       for (let i = 1; i <= this.vertices.length; i++) {
  //         if (this.vertex(i) === p) {
  //           return [i, true]
  //         }
  //       }
  //       return [notFound, false]
  //     }

  //     const it = this.index.iterator()
  //     if (!it.locatePoint(p)) {
  //       return [notFound, false]
  //     }

  //     const aClipped = it.indexCell().findByShapeID(0)
  //     for (let i = aClipped.numEdges() - 1; i >= 0; i--) {
  //       const ai = aClipped.edges[i]
  //       if (this.vertex(ai) === p) {
  //         return ai === 0 ? [this.vertices.length, true] : [ai, true]
  //       }
  //       if (this.vertex(ai + 1) === p) {
  //         return [ai + 1, true]
  //       }
  //     }
  //     return [notFound, false]
  //   }

  //   containsNested(other: Loop): boolean {
  //     if (!this.subregionBound.contains(other.bound)) {
  //       return false
  //     }

  //     if (this.isEmptyOrFull() || other.numVertices() < 2) {
  //       return this.isFull() || other.isEmpty()
  //     }

  //     const [m, ok] = this.findVertex(other.vertex(1))
  //     if (!ok) {
  //       return this.containsPoint(other.vertex(1))
  //     }

  //     return wedgeContains(this.vertex(m - 1), this.vertex(m), this.vertex(m + 1), other.vertex(0), other.vertex(2))
  //   }

  //   surfaceIntegralFloat64(f: (a: Point, b: Point, c: Point) => number): number {
  //     const maxLength = Math.PI - 1e-5

  //     let sum = 0
  //     let origin = this.vertex(0)
  //     for (let i = 1; i + 1 < this.vertices.length; i++) {
  //       if (this.vertex(i + 1).angle(origin.vector) > maxLength) {
  //         const oldOrigin = origin
  //         if (origin === this.vertex(0)) {
  //           origin = new Point(this.vertex(0).pointCross(this.vertex(i)).normalize())
  //         } else if (this.vertex(i).angle(this.vertex(0).vector) < maxLength) {
  //           origin = this.vertex(0)
  //         } else {
  //           origin = new Point(this.vertex(0).cross(oldOrigin.vector))
  //           sum += f(this.vertex(0), oldOrigin, origin)
  //         }
  //         sum += f(oldOrigin, this.vertex(i), origin)
  //       }
  //       sum += f(origin, this.vertex(i), this.vertex(i + 1))
  //     }
  //     if (origin !== this.vertex(0)) {
  //       sum += f(origin, this.vertex(this.vertices.length - 1), this.vertex(0))
  //     }
  //     return sum
  //   }

  //   surfaceIntegralPoint(f: (a: Point, b: Point, c: Point) => Point): Point {
  //     const maxLength = Math.PI - 1e-5
  //     let sum = new r3.Vector(0, 0, 0)

  //     let origin = this.vertex(0)
  //     for (let i = 1; i + 1 < this.vertices.length; i++) {
  //       if (this.vertex(i + 1).angle(origin.vector) > maxLength) {
  //         const oldOrigin = origin
  //         if (origin === this.vertex(0)) {
  //           origin = new Point(this.vertex(0).pointCross(this.vertex(i)).normalize())
  //         } else if (this.vertex(i).angle(this.vertex(0).vector) < maxLength) {
  //           origin = this.vertex(0)
  //         } else {
  //           origin = new Point(this.vertex(0).cross(oldOrigin.vector))
  //           sum = sum.add(f(this.vertex(0), oldOrigin, origin).vector)
  //         }
  //         sum = sum.add(f(oldOrigin, this.vertex(i), origin).vector)
  //       }
  //       sum = sum.add(f(origin, this.vertex(i), this.vertex(i + 1)).vector)
  //     }
  //     if (origin !== this.vertex(0)) {
  //       sum = sum.add(f(origin, this.vertex(this.vertices.length - 1), this.vertex(0)).vector)
  //     }
  //     return new Point(sum)
  //   }

  //   area(): number {
  //     if (this.isEmptyOrFull()) {
  //       return this.containsOrigin() ? 4 * Math.PI : 0
  //     }
  //     let area = this.surfaceIntegralFloat64(SignedArea)

  //     const maxError = this.turningAngleMaxError()

  //     if (area < 0) {
  //       area += 4 * Math.PI
  //     }

  //     if (area > 4 * Math.PI) {
  //       area = 4 * Math.PI
  //     }
  //     if (area < 0) {
  //       area = 0
  //     }

  //     if (area < maxError && !this.isNormalized()) {
  //       return 4 * Math.PI
  //     } else if (area > 4 * Math.PI - maxError && this.isNormalized()) {
  //       return 0
  //     }

  //     return area
  //   }

  //   centroid(): Point {
  //     return this.surfaceIntegralPoint(TrueCentroid)
  //   }

  //   encode(w: io.Writer): Error | null {
  //     const e = new Encoder(w)
  //     this.encodeHelper(e)
  //     return e.err
  //   }

  //   encodeHelper(e: Encoder): void {
  //     e.writeInt8(encodingVersion)
  //     e.writeUint32(this.vertices.length)
  //     for (const v of this.vertices) {
  //       e.writeFloat64(v.x)
  //       e.writeFloat64(v.y)
  //       e.writeFloat64(v.z)
  //     }

  //     e.writeBool(this.originInside)
  //     e.writeInt32(this.depth)

  //     this.bound.encodeHelper(e)
  //   }

  //   decode(r: io.Reader): Error | null {
  //     const d = new Decoder(asByteReader(r))
  //     this.decodeHelper(d)
  //     return d.err
  //   }

  //   decodeHelper(d: Decoder): void {
  //     const version = d.readUint8()
  //     if (d.err) {
  //       return
  //     }
  //     if (version !== encodingVersion) {
  //       d.err = new Error(`cannot decode version ${version}`)
  //       return
  //     }

  //     const nvertices = d.readUint32()
  //     if (nvertices > maxEncodedVertices) {
  //       if (!d.err) {
  //         d.err = new Error(`too many vertices (${nvertices}; max is ${maxEncodedVertices})`)
  //       }
  //       return
  //     }
  //     this.vertices = new Array(nvertices)
  //     for (let i = 0; i < this.vertices.length; i++) {
  //       this.vertices[i] = new Point(new r3.Vector(d.readFloat64(), d.readFloat64(), d.readFloat64()))
  //     }
  //     this.index = new ShapeIndex()
  //     this.originInside = d.readBool()
  //     this.depth = d.readUint32()
  //     this.bound = Rect.decodeHelper(d)
  //     this.subregionBound = ExpandForSubregions(this.bound)

  //     this.index.add(this)
  //   }

  //   xyzFaceSiTiVertices(): XyzFaceSiTi[] {
  //     return this.vertices.map((v) => {
  //       const [face, si, ti, level] = xyzToFaceSiTi(v)
  //       return new XyzFaceSiTi(v, face, si, ti, level)
  //     })
  //   }

  //   encodeCompressed(e: Encoder, snapLevel: number, vertices: XyzFaceSiTi[]): void {
  //     if (this.vertices.length !== vertices.length) {
  //       throw new Error('encodeCompressed: vertices must be the same length as l.vertices')
  //     }
  //     if (vertices.length > maxEncodedVertices) {
  //       if (!e.err) {
  //         e.err = new Error(`too many vertices (${vertices.length}; max is ${maxEncodedVertices})`)
  //       }
  //       return
  //     }
  //     e.writeUvarint(vertices.length)
  //     encodePointsCompressed(e, vertices, snapLevel)

  //     const props = this.compressedEncodingProperties()
  //     e.writeUvarint(props)
  //     e.writeUvarint(this.depth)
  //     if (props & boundEncoded) {
  //       this.bound.encodeHelper(e)
  //     }
  //   }

  //   compressedEncodingProperties(): number {
  //     let properties = 0
  //     if (this.originInside) {
  //       properties |= originInside
  //     }

  //     const minVerticesForBound = 64
  //     if (this.vertices.length >= minVerticesForBound) {
  //       properties |= boundEncoded
  //     }

  //     return properties
  //   }

  //   decodeCompressed(d: Decoder, snapLevel: number): void {
  //     const nvertices = d.readUvarint()
  //     if (d.err) {
  //       return
  //     }
  //     if (nvertices > maxEncodedVertices) {
  //       d.err = new Error(`too many vertices (${nvertices}; max is ${maxEncodedVertices})`)
  //       return
  //     }
  //     this.vertices = new Array(nvertices)
  //     decodePointsCompressed(d, snapLevel, this.vertices)
  //     const properties = d.readUvarint()

  //     if (d.err) {
  //       return
  //     }

  //     this.index = new ShapeIndex()
  //     this.originInside = (properties & originInside) !== 0
  //     this.depth = d.readUvarint()

  //     if ((properties & boundEncoded) !== 0) {
  //       this.bound = Rect.decodeHelper(d)
  //       if (d.err) {
  //         return
  //       }
  //       this.subregionBound = ExpandForSubregions(this.bound)
  //     } else {
  //       this.initBound()
  //     }

  //     this.index.add(this)
  //   }
  // }

  // export const containsCenterMatches = (a: ClippedShape, target: CrossingTarget): boolean => {
  //   return (
  //     (!a.containsCenter && target === CrossingTarget.DontCross) || (a.containsCenter && target === CrossingTarget.Cross)
  //   )
  // }

  // export const hasCrossingRelation = (a: Loop, b: Loop, relation: LoopRelation): boolean => {
  //   const ai = new RangeIterator(a.index)
  //   const bi = new RangeIterator(b.index)

  //   const ab = new LoopCrosser(a, b, relation, false)
  //   const ba = new LoopCrosser(b, a, relation, true)

  //   while (!ai.done() || !bi.done()) {
  //     if (ai.rangeMax < bi.rangeMin) {
  //       ai.seekTo(bi)
  //     } else if (bi.rangeMax < ai.rangeMin) {
  //       bi.seekTo(ai)
  //     } else {
  //       const abRelation = ai.it.cellID().lsb() - bi.it.cellID().lsb()
  //       if (abRelation > 0) {
  //         if (ab.hasCrossingRelation(ai, bi)) {
  //           return true
  //         }
  //       } else if (abRelation < 0) {
  //         if (ba.hasCrossingRelation(bi, ai)) {
  //           return true
  //         }
  //       } else {
  //         const aClipped = ai.it.indexCell().shapes[0]
  //         const bClipped = bi.it.indexCell().shapes[0]
  //         if (
  //           containsCenterMatches(aClipped, ab.aCrossingTarget) &&
  //           containsCenterMatches(bClipped, ab.bCrossingTarget)
  //         ) {
  //           return true
  //         }
  //         if (aClipped.numEdges() > 0 && bClipped.numEdges() > 0 && ab.cellCrossesCell(aClipped, bClipped)) {
  //           return true
  //         }
  //         ai.next()
  //         bi.next()
  //       }
  //     }
  //   }
  //   return false
  // }

  // export class ContainsRelation implements LoopRelation {
  //   foundSharedVertex = false

  //   aCrossingTarget(): CrossingTarget {
  //     return CrossingTarget.DontCross
  //   }

  //   bCrossingTarget(): CrossingTarget {
  //     return Crossing

  //     Target.Cross
  //   }

  //   wedgesCross(a0: Point, ab1: Point, a2: Point, b0: Point, b2: Point): boolean {
  //     this.foundSharedVertex = true
  //     return !wedgeContains(a0, ab1, a2, b0, b2)
  //   }
  // }

  // export class IntersectsRelation implements LoopRelation {
  //   foundSharedVertex = false

  //   aCrossingTarget(): CrossingTarget {
  //     return CrossingTarget.Cross
  //   }

  //   bCrossingTarget(): CrossingTarget {
  //     return CrossingTarget.Cross
  //   }

  //   wedgesCross(a0: Point, ab1: Point, a2: Point, b0: Point, b2: Point): boolean {
  //     this.foundSharedVertex = true
  //     return wedgeIntersects(a0, ab1, a2, b0, b2)
  //   }
  // }

  // export class CompareBoundaryRelation implements LoopRelation {
  //   reverse: boolean
  //   foundSharedVertex = false
  //   containsEdge = false
  //   excludesEdge = false

  //   constructor(reverse: boolean) {
  //     this.reverse = reverse
  //   }

  //   aCrossingTarget(): CrossingTarget {
  //     return CrossingTarget.DontCare
  //   }

  //   bCrossingTarget(): CrossingTarget {
  //     return CrossingTarget.DontCare
  //   }

  //   wedgesCross(a0: Point, ab1: Point, a2: Point, b0: Point, b2: Point): boolean {
  //     this.foundSharedVertex = true
  //     if (wedgeContainsSemiwedge(a0, ab1, a2, b2, this.reverse)) {
  //       this.containsEdge = true
  //     } else {
  //       this.excludesEdge = true
  //     }
  //     return this.containsEdge && this.excludesEdge
  //   }
}

// export const wedgeContainsSemiwedge = (a0: Point, ab1: Point, a2: Point, b2: Point, reverse: boolean): boolean => {
//   if (b2 === a0 || b2 === a2) {
//     return (b2 === a0) === reverse
//   }
//   return orderedCCW(a0, a2, b2, ab1)
// }

// export const containsNonCrossingBoundary = (l: Loop, other: Loop, reverseOther: boolean): boolean => {
//   if (!l.bound.intersects(other.bound)) {
//     return false
//   }

//   if (l.isFull()) {
//     return true
//   }
//   if (other.isFull()) {
//     return false
//   }

//   const [m, ok] = l.findVertex(other.vertex(0))
//   if (!ok) {
//     return l.containsPoint(other.vertex(0))
//   }
//   return wedgeContainsSemiwedge(l.vertex(m - 1), l.vertex(m), l.vertex(m + 1), other.vertex(1), reverseOther)
// }
