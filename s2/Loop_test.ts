import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { Loop } from './Loop'
import { parsePoint, parsePoints } from './testing_textformat'
import { Point } from './Point'
import { LatLng } from './LatLng'
import { RectBounder } from './RectBounder'
import { pointsApproxEqual, randomPoint, rectsApproxEqual } from './testing'
import { Interval as R1Interval } from '../r1/Interval'
import * as cellid from './cellid'
import { DBL_EPSILON, EPSILON } from './predicates'
import { Cell } from './Cell'
import { rectFromDegrees } from './Rect_test'
import { DEGREE } from '../s1/angle_constants'

const DEFAULT_RADIUS_KM = 10.0
const NUM_LOOP_SAMPLES = 16
const NUM_QUERIES_PER_LOOP = 100

// The northern hemisphere, defined using two pairs of antipodal points.
const northHemi = new Loop(parsePoints('0:-180, 0:-90, 0:0, 0:90'))

// The northern hemisphere, defined using three points 120 degrees apart.
const northHemi3 = new Loop(parsePoints('0:-180, 0:-60, 0:60'))

// The southern hemisphere, defined using two pairs of antipodal points.
const southHemi = new Loop(parsePoints('0:90, 0:0, 0:-90, 0:-180'))

// The western hemisphere, defined using two pairs of antipodal points.
const westHemi = new Loop(parsePoints('0:-180, -90:0, 0:0, 90:0'))

// The eastern hemisphere, defined using two pairs of antipodal points.
const eastHemi = new Loop(parsePoints('90:0, 0:0, -90:0, 0:-180'))

// The "near" hemisphere, defined using two pairs of antipodal points.
const nearHemi = new Loop(parsePoints('0:-90, -90:0, 0:90, 90:0'))

// The "far" hemisphere, defined using two pairs of antipodal points.
const farHemi = new Loop(parsePoints('90:0, 0:90, -90:0, 0:-90'))

// A spiral stripe that slightly over-wraps the equator.
const candyCane = new Loop(parsePoints('-20:150, -20:-70, 0:70, 10:-150, 10:70, -10:-70'))

// A small clockwise loop in the northern & eastern hemispheres.
const smallNECW = new Loop(parsePoints('35:20, 45:20, 40:25'))

// Loop around the north pole at 80 degrees.
const arctic80 = new Loop(parsePoints('80:-150, 80:-30, 80:90'))

// Loop around the south pole at 80 degrees.
const antarctic80 = new Loop(parsePoints('-80:120, -80:0, -80:-120'))

// A completely degenerate triangle along the equator that RobustCCW()
// considers to be CCW.
const lineTriangle = new Loop(parsePoints('0:1, 0:2, 0:3'))

// A nearly-degenerate CCW chevron near the equator with very long sides
// (about 80 degrees). Its area is less than 1e-640, which is too small
// to represent in double precision.
const skinnyChevron = new Loop(parsePoints('0:0, -1e-320:80, 0:1e-320, 1e-320:80'))

// A diamond-shaped loop around the point 0:180.
const loopA = new Loop(parsePoints('0:178, -1:180, 0:-179, 1:-180'))

// Like loopA, but the vertices are at leaf cell centers.
const snappedLoopA = new Loop([
  cellid.point(cellid.fromPoint(parsePoint('0:178'))),
  cellid.point(cellid.fromPoint(parsePoint('-1:180'))),
  cellid.point(cellid.fromPoint(parsePoint('0:-179'))),
  cellid.point(cellid.fromPoint(parsePoint('1:-180')))
])

// A different diamond-shaped loop around the point 0:180.
const loopB = new Loop(parsePoints('0:179, -1:180, 0:-178, 1:-180'))

// The intersection of A and B.
const aIntersectB = new Loop(parsePoints('0:179, -1:180, 0:-179, 1:-180'))

// The union of A and B.
const aUnionB = new Loop(parsePoints('0:178, -1:180, 0:-178, 1:-180'))

// A minus B (concave).
const aMinusB = new Loop(parsePoints('0:178, -1:180, 0:179, 1:-180'))

// B minus A (concave).
const bMinusA = new Loop(parsePoints('0:-179, -1:180, 0:-178, 1:-180'))

// A shape gotten from A by adding a triangle to one edge, and
// subtracting a triangle from the opposite edge.
const loopC = new Loop(parsePoints('0:178, 0:180, -1:180, 0:-179, 1:-179, 1:-180'))

// A shape gotten from A by adding a triangle to one edge, and
// adding another triangle to the opposite edge.
const loopD = new Loop(parsePoints('0:178, -1:178, -1:180, 0:-179, 1:-179, 1:-180'))

//   3------------2
//   |            |               ^
//   |  7-8  b-c  |               |
//   |  | |  | |  |      Latitude |
//   0--6-9--a-d--1               |
//   |  | |       |               |
//   |  f-e       |               +----------->
//   |            |                 Longitude
//   4------------5
//
// Important: It is not okay to skip over collinear vertices when
// defining these loops (e.g. to define loop E as "0,1,2,3") because S2
// uses symbolic perturbations to ensure that no three vertices are
// *ever* considered collinear (e.g., vertices 0, 6, 9 are not
// collinear).  In other words, it is unpredictable (modulo knowing the
// details of the symbolic perturbations) whether 0123 contains 06123
// for example.

// Loop E:  0,6,9,a,d,1,2,3
const loopE = new Loop(parsePoints('0:30, 0:34, 0:36, 0:39, 0:41, 0:44, 30:44, 30:30'))

// Loop F:  0,4,5,1,d,a,9,6
const loopF = new Loop(parsePoints('0:30, -30:30, -30:44, 0:44, 0:41, 0:39, 0:36, 0:34'))

// Loop G:  0,6,7,8,9,a,b,c,d,1,2,3
const loopG = new Loop(parsePoints('0:30, 0:34, 10:34, 10:36, 0:36, 0:39, 10:39, 10:41, 0:41, 0:44, 30:44, 30:30'))

// Loop H:  0,6,f,e,9,a,b,c,d,1,2,3
const loopH = new Loop(parsePoints('0:30, 0:34, -10:34, -10:36, 0:36, 0:39, 10:39, 10:41, 0:41, 0:44, 30:44, 30:30'))

// Loop I:  7,6,f,e,9,8
const loopI = new Loop(parsePoints('10:34, 0:34, -10:34, -10:36, 0:36, 10:36'))

// The set of all test loops.
const allLoops = [
  Loop.emptyLoop(),
  Loop.fullLoop(),
  northHemi,
  northHemi3,
  southHemi,
  westHemi,
  eastHemi,
  nearHemi,
  farHemi,
  candyCane,
  smallNECW,
  arctic80,
  antarctic80,
  lineTriangle,
  skinnyChevron,
  loopA,
  // snappedLoopA, // Fails TestAreaConsistentWithTurningAngle
  loopB,
  aIntersectB,
  aUnionB,
  aMinusB,
  bMinusA,
  loopC,
  loopD,
  loopE,
  loopF,
  loopG,
  loopH,
  loopI
]

/**
 * Rotates the vertices of the loop by moving the first vertex to the end of the list.
 */
export const rotate = (l: Loop): Loop => {
  const vertices: Point[] = []

  // Add all vertices from index 1 to the end.
  for (let i = 1; i < l.vertices.length; i++) {
    vertices.push(l.vertices[i])
  }

  // Add the first vertex to the end.
  vertices.push(l.vertices[0])

  return new Loop(vertices)
}

describe('s2.Loop', () => {
  test('empty loop', () => {
    const shape = Loop.emptyLoop()

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 2)
    ok(shape.isEmpty())
    ok(!shape.isFull())
    ok(shape.isEmptyOrFull())
    ok(!shape.referencePoint().contained)
  })

  test('full loop', () => {
    const shape = Loop.fullLoop()

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 1)
    equal(shape.dimension(), 2)
    ok(!shape.isEmpty())
    ok(shape.isFull())
    ok(shape.isEmptyOrFull())
    ok(shape.referencePoint().contained)
  })

  test('basic', () => {
    const shape = new Loop(parsePoints('0:0, 0:1, 1:0'))

    equal(shape.numEdges(), 3)
    equal(shape.numChains(), 1)
    equal(shape.chain(0).start, 0)
    equal(shape.chain(0).length, 3)

    const e = shape.edge(2)
    ok(e.v0.approxEqual(Point.fromLatLng(LatLng.fromDegrees(1, 0))))
    ok(e.v1.approxEqual(Point.fromLatLng(LatLng.fromDegrees(0, 0))))
    equal(shape.dimension(), 2)
    ok(!shape.isEmpty())
    ok(!shape.isFull())
    ok(!shape.referencePoint().contained)
  })

  test('HoleAndSign', () => {
    const l = new Loop(parsePoints('0:-180, 0:-90, 0:0, 0:90'))

    ok(!l.isHole())
    equal(l.sign(), 1)

    l.depth = 3
    ok(l.isHole())
    equal(l.sign(), -1)

    l.depth = 2
    ok(!l.isHole())
    equal(l.sign(), 1)
  })

  test('RectBound', () => {
    const rectError = RectBounder.maxErrorForTests()

    ok(Loop.emptyLoop().rectBound().isEmpty())
    ok(Loop.fullLoop().rectBound().isFull())
    ok(candyCane.rectBound().lng.isFull())
    ok(candyCane.rectBound().lat.lo < -0.349066)
    ok(candyCane.rectBound().lat.hi > 0.174533)
    ok(smallNECW.rectBound().isFull())

    const arctic80Bound = arctic80.rectBound()
    const expectedArcticBound = rectFromDegrees(80, -180, 90, 180)
    ok(rectsApproxEqual(arctic80Bound, expectedArcticBound, rectError.lat, rectError.lng))

    const antarctic80Bound = antarctic80.rectBound()
    const expectedAntarcticBound = rectFromDegrees(-90, -180, -80, 180)
    ok(rectsApproxEqual(antarctic80Bound, expectedAntarcticBound, rectError.lat, rectError.lng))

    const southHemiBound = southHemi.rectBound()
    ok(southHemiBound.lng.isFull())
    ok(southHemiBound.lat.approxEqual(new R1Interval(-Math.PI / 2, 0), rectError.lat))

    const arctic80Inv = Loop.fromLoop(arctic80)
    arctic80Inv.invert()
    const mid = Point.fromVector(arctic80Inv.vertices[0].vector.add(arctic80Inv.vertices[1].vector).mul(0.5))
    ok(Math.abs(arctic80Inv.rectBound().lat.hi - LatLng.fromPoint(mid).lat) < 10 * DBL_EPSILON)
  })

  test('capBound', () => {
    ok(Loop.emptyLoop().capBound().isEmpty())
    ok(Loop.fullLoop().capBound().isFull())
    ok(smallNECW.capBound().isFull())

    const arctic80Bound = arctic80.capBound()
    const expectedArcticBound = rectFromDegrees(80, -180, 90, 180).capBound()
    ok(arctic80Bound.approxEqual(expectedArcticBound))

    const antarctic80Bound = antarctic80.capBound()
    const expectedAntarcticBound = rectFromDegrees(-90, -180, -80, 180).capBound()
    ok(antarctic80Bound.approxEqual(expectedAntarcticBound))
  })

  test('originInside', () => {
    ok(northHemi.originInside)
    ok(northHemi3.originInside)
    ok(!southHemi.originInside)
    ok(!westHemi.originInside)
    ok(eastHemi.originInside)
    ok(!nearHemi.originInside)
    ok(farHemi.originInside)
    ok(!candyCane.originInside)
    ok(smallNECW.originInside)
    ok(arctic80.originInside)
    ok(!antarctic80.originInside)
    ok(!loopA.originInside)
  })

  test('containsPoint', () => {
    const north = new Point(0, 0, 1)
    const south = new Point(0, 0, -1)
    const east = Point.fromCoords(0, 1, 0)
    const west = Point.fromCoords(0, -1, 0)

    ok(!Loop.emptyLoop().containsPoint(north))
    ok(Loop.fullLoop().containsPoint(south))

    const cases = [
      { name: 'north hemisphere', loop: northHemi, inPoint: north, outPoint: south },
      { name: 'south hemisphere', loop: southHemi, inPoint: south, outPoint: north },
      { name: 'west hemisphere', loop: westHemi, inPoint: west, outPoint: east },
      { name: 'east hemisphere', loop: eastHemi, inPoint: east, outPoint: west },
      {
        name: 'candy cane',
        loop: candyCane,
        inPoint: Point.fromLatLng(LatLng.fromDegrees(5, 71)),
        outPoint: Point.fromLatLng(LatLng.fromDegrees(-8, 71))
      }
    ]

    for (const { name, loop, inPoint, outPoint } of cases) {
      let currentLoop = loop
      for (let i = 0; i < 4; i++) {
        ok(currentLoop.containsPoint(inPoint), `${name} loop should contain ${inPoint} at rotation ${i}`)
        ok(!currentLoop.containsPoint(outPoint), `${name} loop shouldn't contain ${outPoint} at rotation ${i}`)
        currentLoop = rotate(currentLoop)
      }
    }

    for (let level = 0; level < 3; level++) {
      const points = new Map<Point, boolean>()
      const loops: Loop[] = []
      for (
        let id = cellid.childBeginAtLevel(cellid.fromFace(0), level);
        id !== cellid.childEndAtLevel(cellid.fromFace(5), level);
        id = cellid.next(id)
      ) {
        const cell = Cell.fromCellID(id)
        points.set(cell.center(), true)
        const vertices: Point[] = []
        for (let k = 0; k < 4; k++) {
          vertices.push(cell.vertex(k))
          points.set(cell.vertex(k), true)
        }
        loops.push(new Loop(vertices))
      }

      for (const point of points.keys()) {
        let count = 0
        for (const loop of loops) {
          if (loop.containsPoint(point)) count++
        }
        equal(count, 1, `point ${point} should only be contained by one loop at level ${level}, got ${count}`)
      }
    }
  })

  test('vertex', () => {
    const tests = [
      { loop: Loop.emptyLoop(), vertex: 0, want: new Point(0, 0, 1) },
      { loop: Loop.emptyLoop(), vertex: 1, want: new Point(0, 0, 1) },
      { loop: Loop.fullLoop(), vertex: 0, want: new Point(0, 0, -1) },
      { loop: Loop.fullLoop(), vertex: 1, want: new Point(0, 0, -1) },
      { loop: arctic80, vertex: 0, want: parsePoint('80:-150') },
      { loop: arctic80, vertex: 1, want: parsePoint('80:-30') },
      { loop: arctic80, vertex: 2, want: parsePoint('80:90') },
      { loop: arctic80, vertex: 3, want: parsePoint('80:-150') }
    ]

    for (const { loop, vertex, want } of tests) {
      ok(
        pointsApproxEqual(loop.vertex(vertex), want, EPSILON),
        `${loop}.vertex(${vertex}) = ${loop.vertex(vertex)}, want ${want}`
      )
    }

    ok(pointsApproxEqual(arctic80.vertex(2), arctic80.vertex(5), EPSILON), `Vertex should wrap values.`)
    const loopAroundThrice = 2 + 3 * arctic80.vertices.length
    ok(pointsApproxEqual(arctic80.vertex(2), arctic80.vertex(loopAroundThrice), EPSILON), `Vertex should wrap values.`)
  })

  test('numEdges', () => {
    const tests = [
      { loop: Loop.emptyLoop(), want: 0 },
      { loop: Loop.fullLoop(), want: 0 },
      { loop: farHemi, want: 4 },
      { loop: candyCane, want: 6 },
      { loop: smallNECW, want: 3 },
      { loop: arctic80, want: 3 },
      { loop: antarctic80, want: 3 },
      { loop: lineTriangle, want: 3 },
      { loop: skinnyChevron, want: 4 }
    ]

    for (const { loop, want } of tests) {
      equal(loop.numEdges(), want, `${loop}.NumEdges() = ${loop.numEdges()}, want ${want}`)
    }
  })

  test('edge', () => {
    const tests = [
      {
        loop: farHemi,
        edge: 2,
        wantA: new Point(0, 0, -1),
        wantB: new Point(0, -1, 0)
      },
      {
        loop: candyCane,
        edge: 0,
        wantA: parsePoint('-20:150'),
        wantB: parsePoint('-20:-70')
      },
      {
        loop: candyCane,
        edge: 1,
        wantA: parsePoint('-20:-70'),
        wantB: parsePoint('0:70')
      },
      {
        loop: candyCane,
        edge: 2,
        wantA: parsePoint('0:70'),
        wantB: parsePoint('10:-150')
      },
      {
        loop: candyCane,
        edge: 3,
        wantA: parsePoint('10:-150'),
        wantB: parsePoint('10:70')
      },
      {
        loop: candyCane,
        edge: 4,
        wantA: parsePoint('10:70'),
        wantB: parsePoint('-10:-70')
      },
      {
        loop: candyCane,
        edge: 5,
        wantA: parsePoint('-10:-70'),
        wantB: parsePoint('-20:150')
      },
      {
        loop: skinnyChevron,
        edge: 2,
        wantA: parsePoint('0:1e-320'),
        wantB: parsePoint('1e-320:80')
      },
      {
        loop: skinnyChevron,
        edge: 3,
        wantA: parsePoint('1e-320:80'),
        wantB: parsePoint('0:0')
      }
    ]

    for (const { loop, edge, wantA, wantB } of tests) {
      const e = loop.edge(edge)
      ok(
        e.v0.approxEqual(wantA, EPSILON) && e.v1.approxEqual(wantB, EPSILON),
        `${loop}.Edge(${edge}) = ${e}, want (${wantA}, ${wantB})`
      )
    }
  })

  test('fromCell', () => {
    const cell = Cell.fromCellID(cellid.fromLatLng(LatLng.fromDegrees(40.565459, -74.645276)))
    const loopFromCell = Loop.fromCell(cell)

    ok(
      !loopFromCell.rectBound().contains(cell.rectBound()),
      "loopFromCell's RectBound contains the original cells RectBound, but should not"
    )
  })

  test('regularLoop', () => {
    const loop = Loop.regularLoop(Point.fromLatLng(LatLng.fromDegrees(80, 135)), 20 * DEGREE, 4)
    equal(loop.vertices.length, 4, `RegularLoop with 4 vertices should have 4 vertices, got ${loop.vertices.length}`)
    // The actual Points values are already tested in the s2point_test method TestRegularPoints.
  })

  // The following test loops can be defined similarly using the provided Point and Loop classes.
  // Further tests can also be translated using this same pattern.

  test('area consistent with turning angle', () => {
    for (let x = 0; x < allLoops.length; x++) {
      const loop = allLoops[x]
      const area = loop.area()
      const gaussArea = 2 * Math.PI - loop.turningAngle()

      ok(Math.abs(area - gaussArea) <= 1e-9, `${x}. ${loop}.Area() = ${area}, want ${gaussArea}`)
    }
  })
})
