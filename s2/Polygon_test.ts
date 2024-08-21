import { test, describe } from 'node:test'
import { equal, notEqual, ok } from 'node:assert/strict'
import { Polygon } from './Polygon'
import { Loop } from './Loop'
import {
  concentricLoopsPolygon,
  EARTH_RADIUS_KM,
  float64Eq,
  oneIn,
  randomPoint,
  randomUniformInt,
  rectsApproxEqual
} from './testing'
import { parsePoint, makeLoop, makePolygon } from './testing_textformat'
import { Point } from './Point'
import { LatLng } from './LatLng'
import { rectFromDegrees } from './Rect_test'
import { DEGREE } from '../s1/angle_constants'
import type { Shape } from './Shape'

// A set of nested loops around the LatLng point 0:0.
// Every vertex of nearLoop0 is also a vertex of nearLoop1.
const NEAR_POINT = '0:0'
const NEAR_LOOP_0 = '-1:0, 0:1, 1:0, 0:-1;'
const NEAR_LOOP_1 = '-1:-1, -1:0, -1:1, 0:1, 1:1, 1:0, 1:-1, 0:-1;'
const NEAR_LOOP_2 = '-1:-2, -2:5, 5:-2;'
const NEAR_LOOP_3 = '-2:-2, -3:6, 6:-3;'
const NEAR_LOOP_HEMI = '0:-90, -90:0, 0:90, 90:0;'

// A set of nested loops around the LatLng point 0:180. Every vertex of
// farLoop0 and farLoop2 belongs to farLoop1, and all the loops except
// farLoop2 are non-convex.
const FAR_POINT = '0:180'
const FAR_LOOP_0 = '0:179, 1:180, 0:-179, 2:-180;'
const FAR_LOOP_1 = '0:179, -1:179, 1:180, -1:-179, 0:-179, 3:-178, 2:-180, 3:178;'
const FAR_LOOP_2 = '3:-178, 3:178, -1:179, -1:-179;'
const FAR_LOOP_3 = '-3:-178, 4:-177, 4:177, -3:178, -2:179;'
const FAR_LOOP_HEMI = '0:-90, 60:90, -60:90;'

// A set of nested loops around the LatLng point -90:0.
const SOUTH_LOOP_POINT = '-89.9999:0.001'
const SOUTH_LOOP_0A = '-90:0, -89.99:0.01, -89.99:0;'
const SOUTH_LOOP_0B = '-90:0, -89.99:0.03, -89.99:0.02;'
const SOUTH_LOOP_0C = '-90:0, -89.99:0.05, -89.99:0.04;'
const SOUTH_LOOP_1 = '-90:0, -89.9:0.1, -89.9:-0.1;'
const SOUTH_LOOP_2 = '-90:0, -89.8:0.2, -89.8:-0.2;'
const SOUTH_LOOP_HEMI = '0:-180, 0:60, 0:-60;'

// Two different loops that surround all the near and far loops except
// for the hemispheres.
const NEAR_FAR_LOOP_1 = '-1:-9, -9:-9, -9:9, 9:9, 9:-9, 1:-9, ' + '1:-175, 9:-175, 9:175, -9:175, -9:-175, -1:-175;'
const NEAR_FAR_LOOP_2 = '-2:15, -2:170, -8:-175, 8:-175, ' + '2:170, 2:15, 8:-4, -8:-4;'

// Loop that results from intersection of other loops.
const FAR_HEMI_SOUTH_HEMI_LOOP = '0:-180, 0:90, -60:90, 0:-90;'

// Rectangles that form a cross, with only shared vertices, no crossing
// edges. Optional holes outside the intersecting region.
const LOOP_CROSS_1 = '-2:1, -1:1, 1:1, 2:1, 2:-1, 1:-1, -1:-1, -2:-1;'
const LOOP_CROSS_1_SIDE_HOLE = '-1.5:0.5, -1.2:0.5, -1.2:-0.5, -1.5:-0.5;'
const LOOP_CROSS_CENTER_HOLE = '-0.5:0.5, 0.5:0.5, 0.5:-0.5, -0.5:-0.5;'
const LOOP_CROSS_2_SIDE_HOLE = '0.5:-1.5, 0.5:-1.2, -0.5:-1.2, -0.5:-1.5;'
const LOOP_CROSS_2 = '1:-2, 1:-1, 1:1, 1:2, -1:2, -1:1, -1:-1, -1:-2;'

// Two rectangles that intersect, but no edges cross and there's always
// local containment (rather than crossing) at each shared vertex.
// In this ugly ASCII art, 1 is A+B, 2 is B+C:
//   +---+---+---+
//   | A | B | C |
//   +---+---+---+
const LOOP_OVERLAP_1 = '0:1, 1:1, 2:1, 2:0, 1:0, 0:0;'
const LOOP_OVERLAP_1_SIDE_HOLE = '0.2:0.8, 0.8:0.8, 0.8:0.2, 0.2:0.2;'
const LOOP_OVERLAP_CENTER_HOLE = '1.2:0.8, 1.8:0.8, 1.8:0.2, 1.2:0.2;'
const LOOP_OVERLAP_2_SIDE_HOLE = '2.2:0.8, 2.8:0.8, 2.8:0.2, 2.2:0.2;'
const LOOP_OVERLAP_2 = '1:1, 2:1, 3:1, 3:0, 2:0, 1:0;'

// By symmetry, the intersection of the two polygons has almost half the area
// of either polygon.
//   +---+
//   | 3 |
//   +---+---+
//   |3+4| 4 |
//   +---+---+
const LOOP_OVERLAP_3 = '-10:10, 0:10, 0:-10, -10:-10, -10:0'
const LOOP_OVERLAP_4 = '-10:0, 10:0, 10:-10, -10:-10'

// Some standard polygons to use in the tests.
const emptyPolygon = new Polygon()
const fullPolygon = Polygon.fullPolygon()

const near0Polygon = makePolygon(NEAR_LOOP_0, true)
const near01Polygon = makePolygon(NEAR_LOOP_0 + NEAR_LOOP_1, true)
const near30Polygon = makePolygon(NEAR_LOOP_3 + NEAR_LOOP_0, true)
const near23Polygon = makePolygon(NEAR_LOOP_2 + NEAR_LOOP_3, true)
const near0231Polygon = makePolygon(NEAR_LOOP_0 + NEAR_LOOP_2 + NEAR_LOOP_3 + NEAR_LOOP_1, true)

const near023H1Polygon = makePolygon(NEAR_LOOP_0 + NEAR_LOOP_2 + NEAR_LOOP_3 + NEAR_LOOP_HEMI + NEAR_LOOP_1, true)

const far01Polygon = makePolygon(FAR_LOOP_0 + FAR_LOOP_1, true)
const far21Polygon = makePolygon(FAR_LOOP_2 + FAR_LOOP_1, true)
const far231Polygon = makePolygon(FAR_LOOP_2 + FAR_LOOP_3 + FAR_LOOP_1, true)
const far2H0Polygon = makePolygon(FAR_LOOP_2 + FAR_LOOP_HEMI + FAR_LOOP_0, true)
const far2H013Polygon = makePolygon(FAR_LOOP_2 + FAR_LOOP_HEMI + FAR_LOOP_0 + FAR_LOOP_1 + FAR_LOOP_3, true)

const south0abPolygon = makePolygon(SOUTH_LOOP_0A + SOUTH_LOOP_0B, true)
const south2Polygon = makePolygon(SOUTH_LOOP_2, true)
const south20b1Polygon = makePolygon(SOUTH_LOOP_2 + SOUTH_LOOP_0B + SOUTH_LOOP_1, true)
const south2H1Polygon = makePolygon(SOUTH_LOOP_2 + SOUTH_LOOP_HEMI + SOUTH_LOOP_1, true)
const south20bH0acPolygon = makePolygon(
  SOUTH_LOOP_2 + SOUTH_LOOP_0B + SOUTH_LOOP_HEMI + SOUTH_LOOP_0A + SOUTH_LOOP_0C,
  true
)

const nf1N10F2S10abcPolygon = makePolygon(
  SOUTH_LOOP_0C +
    FAR_LOOP_2 +
    NEAR_LOOP_1 +
    NEAR_FAR_LOOP_1 +
    NEAR_LOOP_0 +
    SOUTH_LOOP_1 +
    SOUTH_LOOP_0B +
    SOUTH_LOOP_0A,
  true
)

const nf2N2F210S210abPolygon = makePolygon(
  FAR_LOOP_2 +
    SOUTH_LOOP_0A +
    FAR_LOOP_1 +
    SOUTH_LOOP_1 +
    FAR_LOOP_0 +
    SOUTH_LOOP_0B +
    NEAR_FAR_LOOP_2 +
    SOUTH_LOOP_2 +
    NEAR_LOOP_2,
  true
)

const f32n0Polygon = makePolygon(FAR_LOOP_2 + NEAR_LOOP_0 + FAR_LOOP_3, true)
const n32s0bPolygon = makePolygon(NEAR_LOOP_3 + SOUTH_LOOP_0B + NEAR_LOOP_2, true)

const cross1Polygon = makePolygon(LOOP_CROSS_1, true)
const cross1SideHolePolygon = makePolygon(LOOP_CROSS_1 + LOOP_CROSS_1_SIDE_HOLE, true)
const cross1CenterHolePolygon = makePolygon(LOOP_CROSS_1 + LOOP_CROSS_CENTER_HOLE, true)
const cross2Polygon = makePolygon(LOOP_CROSS_2, true)
const cross2SideHolePolygon = makePolygon(LOOP_CROSS_2 + LOOP_CROSS_2_SIDE_HOLE, true)
const cross2CenterHolePolygon = makePolygon(LOOP_CROSS_2 + LOOP_CROSS_CENTER_HOLE, true)

const overlap1Polygon = makePolygon(LOOP_OVERLAP_1, true)
const overlap1SideHolePolygon = makePolygon(LOOP_OVERLAP_1 + LOOP_OVERLAP_1_SIDE_HOLE, true)
const overlap1CenterHolePolygon = makePolygon(LOOP_OVERLAP_1 + LOOP_OVERLAP_CENTER_HOLE, true)
const overlap2Polygon = makePolygon(LOOP_OVERLAP_2, true)
const overlap2SideHolePolygon = makePolygon(LOOP_OVERLAP_2 + LOOP_OVERLAP_2_SIDE_HOLE, true)
const overlap2CenterHolePolygon = makePolygon(LOOP_OVERLAP_2 + LOOP_OVERLAP_CENTER_HOLE, true)

const overlap3Polygon = makePolygon(LOOP_OVERLAP_3, true)
const overlap4Polygon = makePolygon(LOOP_OVERLAP_4, true)

const farHemiPolygon = makePolygon(FAR_LOOP_HEMI, true)
const southHemiPolygon = makePolygon(SOUTH_LOOP_HEMI, true)
const farSouthHemiPolygon = makePolygon(FAR_HEMI_SOUTH_HEMI_LOOP, true)

describe('s2.Polygon', () => {
  test('init single loop', () => {
    ok(Polygon.fromLoops([Loop.emptyLoop()]).isEmpty())
    ok(Polygon.fromLoops([Loop.fullLoop()]).isFull())
    const p = Polygon.fromLoops([makeLoop('0:0, 0:10, 10:0')])
    equal(p.numVertices, 3)
  })

  test('empty', () => {
    const shape = emptyPolygon

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    equal(shape.dimension(), 2)
    ok(shape.isEmpty())
    ok(!shape.isFull())
    ok(!shape.referencePoint().contained)
  })

  test('full', () => {
    const shape = fullPolygon

    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 1)
    equal(shape.chain(0).start, 0)
    equal(shape.chain(0).length, 0)
    equal(shape.dimension(), 2)
    ok(!shape.isEmpty())
    ok(shape.isFull())
    ok(shape.referencePoint().contained)
  })

  test('init loop properties gets right bounds', () => {
    // Before the change to initLoopProperties to start the bounds as an
    // EmptyRect instead of it default to the zero rect, the bounds
    // computations failed. Lo was set to min (0, 12.55) and Hi was set to
    // max (0, -70.02).  So this poly would have a bounds of
    //   Lo: [0, -70.05],     Hi: [12.58, 0]]      instead of:
    //   Lo: [12.55, -70.05], Hi: [12.58, -70.02]]
    const p = Polygon.fromLoops([
      makeLoop('12.55:-70.05, 12.55:-70.02, 12.58:-70.02, 12.58:-70.05'),
      makeLoop('12.56:-70.04, 12.56:-70.03, 12.58:-70.03, 12.58:-70.04')
    ])
    const want = rectFromDegrees(12.55, -70.05, 12.58, -70.02)
    ok(rectsApproxEqual(p.rectBound(), want, 1e-6, 1e-6))
  })

  test('shape', () => {
    const numLoops = 100
    const NumVerticesPerLoop = 6
    const concentric = concentricLoopsPolygon(Point.fromCoords(1, 0, 0), numLoops, NumVerticesPerLoop)

    const tests = [{ p: near0Polygon }, { p: near0231Polygon }, { p: concentric }]

    for (const { p } of tests) {
      const shape = p as Shape

      equal(shape.numEdges(), p.numVertices)
      equal(shape.numChains(), p.numLoops())

      let edgeID = 0
      p.loops.forEach((l, i) => {
        equal(shape.chain(i).start, edgeID)
        equal(shape.chain(i).length, l.vertices.length)
        for (let j = 0; j < l.vertices.length; j++) {
          const edge = shape.edge(edgeID)
          equal(l.orientedVertex(j), edge.v0)
          equal(l.orientedVertex(j + 1), edge.v1)
          edgeID++
        }
      })

      equal(shape.dimension(), 2)
      ok(!shape.isEmpty())
      ok(!shape.isFull())
      equal(p.containsPoint(Point.originPoint()), shape.referencePoint().contained)
    }
  })

  test('uninitialized is valid', () => {
    const p = new Polygon()
    equal(p.validate(), null)
  })

  test('is valid loop nesting invalid', () => {
    const ITERS = 1000

    for (let iter = 0; iter < ITERS; iter++) {
      const loops = generatePolygonConcentricTestLoops(2 + randomUniformInt(4), 3)
      if (oneIn(2)) {
        loops.forEach((loop) => reverseLoopVertices(loop))
      }
      checkPolygonInvalid('invalid nesting', loops, false, polygonSetInvalidLoopNesting)
    }
  })

  test('parent', () => {
    const p1 = Polygon.fromLoops([new Loop([])])
    const tests = [
      { p: fullPolygon, have: 0, want: -1, ok: false },
      { p: p1, have: 0, want: -1, ok: false }
    ]

    for (const { p, have, want, ok } of tests) {
      const [got, gotOk] = p.parent(have)
      equal(gotOk, ok)
      equal(got, want)
    }
  })

  test('last descendant', () => {
    const p1 = Polygon.fromLoops([new Loop([])])

    const tests = [
      { p: fullPolygon, have: 0, want: 0 },
      { p: fullPolygon, have: -1, want: 0 },
      { p: p1, have: 0, want: 0 },
      { p: p1, have: -1, want: 0 }
    ]

    for (const { p, have, want } of tests) {
      equal(p.lastDescendant(have), want)
    }
  })

  test('containsPoint', () => {
    const tests = [
      { polygon: NEAR_LOOP_0, point: NEAR_POINT },
      { polygon: NEAR_LOOP_1, point: NEAR_POINT },
      { polygon: NEAR_LOOP_2, point: NEAR_POINT },
      { polygon: NEAR_LOOP_3, point: NEAR_POINT },
      { polygon: NEAR_LOOP_HEMI, point: NEAR_POINT },
      { polygon: SOUTH_LOOP_0A, point: SOUTH_LOOP_POINT },
      { polygon: SOUTH_LOOP_1, point: SOUTH_LOOP_POINT }
    ]

    for (const { polygon, point } of tests) {
      const poly = makePolygon(polygon, true)
      const pt = parsePoint(point)
      ok(poly.containsPoint(pt))
    }
  })

  test('relations', () => {
    const tests = [
      { a: near01Polygon, b: emptyPolygon, contains: true, contained: false, intersects: false },
      { a: near01Polygon, b: near01Polygon, contains: true, contained: true, intersects: true },
      { a: fullPolygon, b: near01Polygon, contains: true, contained: false, intersects: true },
      { a: near01Polygon, b: near30Polygon, contains: false, contained: true, intersects: true },
      { a: near01Polygon, b: near23Polygon, contains: false, contained: false, intersects: false },
      { a: near01Polygon, b: near0231Polygon, contains: false, contained: true, intersects: true },
      { a: near01Polygon, b: near023H1Polygon, contains: false, contained: false, intersects: false },
      { a: near30Polygon, b: near23Polygon, contains: true, contained: false, intersects: true },
      { a: near30Polygon, b: near0231Polygon, contains: true, contained: false, intersects: true },
      { a: near30Polygon, b: near023H1Polygon, contains: false, contained: false, intersects: true },
      { a: near23Polygon, b: near0231Polygon, contains: false, contained: true, intersects: true },
      { a: near23Polygon, b: near023H1Polygon, contains: false, contained: false, intersects: false },
      { a: near0231Polygon, b: near023H1Polygon, contains: false, contained: false, intersects: false },

      { a: far01Polygon, b: far21Polygon, contains: false, contained: false, intersects: false },
      { a: far01Polygon, b: far231Polygon, contains: false, contained: true, intersects: true },
      { a: far01Polygon, b: far2H0Polygon, contains: false, contained: false, intersects: false },
      { a: far01Polygon, b: far2H013Polygon, contains: false, contained: false, intersects: false },
      { a: far21Polygon, b: far231Polygon, contains: false, contained: false, intersects: false },
      { a: far21Polygon, b: far2H0Polygon, contains: false, contained: false, intersects: false },
      { a: far21Polygon, b: far2H013Polygon, contains: false, contained: true, intersects: true },
      { a: far231Polygon, b: far2H0Polygon, contains: false, contained: false, intersects: true },
      { a: far231Polygon, b: far2H013Polygon, contains: false, contained: false, intersects: true },
      { a: far2H0Polygon, b: far2H013Polygon, contains: false, contained: false, intersects: true },

      { a: south0abPolygon, b: south2Polygon, contains: false, contained: true, intersects: true },
      { a: south0abPolygon, b: south20b1Polygon, contains: false, contained: false, intersects: true },
      { a: south0abPolygon, b: south2H1Polygon, contains: false, contained: true, intersects: true },
      { a: south0abPolygon, b: south20bH0acPolygon, contains: false, contained: true, intersects: true },
      { a: south2Polygon, b: south20b1Polygon, contains: true, contained: false, intersects: true },
      { a: south2Polygon, b: south2H1Polygon, contains: false, contained: false, intersects: true },
      { a: south2Polygon, b: south20bH0acPolygon, contains: false, contained: false, intersects: true },
      { a: south20b1Polygon, b: south2H1Polygon, contains: false, contained: false, intersects: true },
      { a: south20b1Polygon, b: south20bH0acPolygon, contains: false, contained: false, intersects: true },
      { a: south2H1Polygon, b: south20bH0acPolygon, contains: true, contained: false, intersects: true },

      { a: nf1N10F2S10abcPolygon, b: nf2N2F210S210abPolygon, contains: false, contained: false, intersects: true },
      { a: nf1N10F2S10abcPolygon, b: near23Polygon, contains: true, contained: false, intersects: true },
      { a: nf1N10F2S10abcPolygon, b: far21Polygon, contains: false, contained: false, intersects: false },
      { a: nf1N10F2S10abcPolygon, b: south0abPolygon, contains: false, contained: false, intersects: false },
      { a: nf1N10F2S10abcPolygon, b: f32n0Polygon, contains: true, contained: false, intersects: true },

      { a: nf2N2F210S210abPolygon, b: near01Polygon, contains: false, contained: false, intersects: false },
      { a: nf2N2F210S210abPolygon, b: far01Polygon, contains: true, contained: false, intersects: true },
      { a: nf2N2F210S210abPolygon, b: south20b1Polygon, contains: true, contained: false, intersects: true },
      { a: nf2N2F210S210abPolygon, b: south0abPolygon, contains: true, contained: false, intersects: true },
      { a: nf2N2F210S210abPolygon, b: n32s0bPolygon, contains: true, contained: false, intersects: true },
      { a: cross1Polygon, b: cross2Polygon, contains: false, contained: false, intersects: true },
      { a: cross1SideHolePolygon, b: cross2Polygon, contains: false, contained: false, intersects: true },
      { a: cross1CenterHolePolygon, b: cross2Polygon, contains: false, contained: false, intersects: true },
      { a: cross1Polygon, b: cross2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: cross1Polygon, b: cross2CenterHolePolygon, contains: false, contained: false, intersects: true },
      { a: cross1SideHolePolygon, b: cross2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: cross1CenterHolePolygon, b: cross2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: cross1SideHolePolygon, b: cross2CenterHolePolygon, contains: false, contained: false, intersects: true },
      { a: cross1CenterHolePolygon, b: cross2CenterHolePolygon, contains: false, contained: false, intersects: true },

      // These cases, when either polygon has a hole, test a different code path from the other cases.
      { a: overlap1Polygon, b: overlap2Polygon, contains: false, contained: false, intersects: true },
      { a: overlap1SideHolePolygon, b: overlap2Polygon, contains: false, contained: false, intersects: true },
      { a: overlap1CenterHolePolygon, b: overlap2Polygon, contains: false, contained: false, intersects: true },
      { a: overlap1Polygon, b: overlap2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: overlap1Polygon, b: overlap2CenterHolePolygon, contains: false, contained: false, intersects: true },
      { a: overlap1SideHolePolygon, b: overlap2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: overlap1CenterHolePolygon, b: overlap2SideHolePolygon, contains: false, contained: false, intersects: true },
      { a: overlap1SideHolePolygon, b: overlap2CenterHolePolygon, contains: false, contained: false, intersects: true },
      {
        a: overlap1CenterHolePolygon,
        b: overlap2CenterHolePolygon,
        contains: false,
        contained: false,
        intersects: true
      }
    ]

    tests.forEach((test, i) => {
      equal(test.a.contains(test.b), test.contains, `${i}. ${test.a}.contains(${test.b}) = ${test.contains}`)
      equal(test.b.contains(test.a), test.contained, `${i}. ${test.b}.contains(${test.a}) = ${test.contained}`)
      equal(test.a.intersects(test.b), test.intersects, `${test.a}.intersects(${test.b}) = ${test.intersects}`)

      if (test.contains) {
        testPolygonNestedPair(test.a, test.b)
      }
      if (test.contained) {
        testPolygonNestedPair(test.b, test.a)
      }
      if (!test.intersects) {
        testPolygonDisjointPair(test.a, test.b)
      }
      if (test.intersects && !(test.contains || test.contained)) {
        testPolygonOverlappingPair(test.a, test.b)
      }
      testPolygonDestructiveUnion(test.a, test.b)
      testPolygonComplements(test.a, test.b)
    })

    testPolygonNestedPair(emptyPolygon, emptyPolygon)
    testPolygonNestedPair(fullPolygon, emptyPolygon)
    testPolygonNestedPair(fullPolygon, fullPolygon)
  })

  test('area', () => {
    const tests = [
      { have: emptyPolygon, want: 0 },
      { have: fullPolygon, want: 4 * Math.PI },
      { have: southHemiPolygon, want: 2 * Math.PI },
      { have: farSouthHemiPolygon, want: Math.PI },
      {
        have: makePolygon(LOOP_CROSS_1_SIDE_HOLE + LOOP_CROSS_CENTER_HOLE, true),
        want:
          makeLoop('-1.5:0.5, -1.2:0.5, -1.2:-0.5, -1.5:-0.5').area() +
          makeLoop('-0.5:0.5, 0.5:0.5, 0.5:-0.5, -0.5:-0.5').area()
      },
      {
        have: makePolygon(LOOP_CROSS_1 + LOOP_CROSS_CENTER_HOLE, true),
        want:
          makeLoop('-2:1, -1:1, 1:1, 2:1, 2:-1, 1:-1, -1:-1, -2:-1').area() -
          makeLoop('-0.5:0.5, 0.5:0.5, 0.5:-0.5, -0.5:-0.5').area()
      }
    ]

    for (const { have, want } of tests) {
      ok(float64Eq(have.area(), want))
    }
  })

  test('centroid', () => {
    const tests = [
      { have: emptyPolygon, want: new Point(0, 0, 0) },
      { have: fullPolygon, want: new Point(0, 0, 0) },
      {
        have: makePolygon(LOOP_CROSS_1_SIDE_HOLE + LOOP_CROSS_CENTER_HOLE, true),
        want: Point.fromVector(
          makeLoop('-1.5:0.5, -1.2:0.5, -1.2:-0.5, -1.5:-0.5')
            .centroid()
            .vector.add(makeLoop('-0.5:0.5, 0.5:0.5, 0.5:-0.5, -0.5:-0.5').centroid().vector)
        )
      },
      {
        have: makePolygon(LOOP_CROSS_1 + LOOP_CROSS_CENTER_HOLE, true),
        want: Point.fromVector(
          makeLoop('-2:1, -1:1, 1:1, 2:1, 2:-1, 1:-1, -1:-1, -2:-1')
            .centroid()
            .vector.sub(makeLoop('-0.5:0.5, 0.5:0.5, 0.5:-0.5, -0.5:-0.5').centroid().vector)
        )
      }
    ]

    for (const { have, want } of tests) {
      equal(have.centroid().vector.cmp(want.vector), 0)
    }
  })

  test('invert', () => {
    const origin = Point.fromLatLng(LatLng.fromDegrees(0, 0))
    const pt = Point.fromLatLng(LatLng.fromDegrees(30, 30))
    const p = Polygon.fromLoops([Loop.regularLoop(origin, 1000 / EARTH_RADIUS_KM, 100)])

    ok(!p.containsPoint(pt))

    p.invert()
    ok(p.containsPoint(pt))
  })
})

/**
 * Flips a random loop's orientation within the polygon.
 */
export const polygonSetInvalidLoopNesting = (p: Polygon) => {
  if (p.loops.length > 0) {
    const i = randomUniformInt(p.loops.length)
    p.loops[i].invert()
  }
}

/**
 * Reverses the order of all vertices in the given loop.
 */
export const reverseLoopVertices = (l: Loop) => {
  for (let i = 0; i < l.vertices.length / 2; i++) {
    const oppositeIndex = l.vertices.length - i - 1
    const temp = l.vertices[i]
    l.vertices[i] = l.vertices[oppositeIndex]
    l.vertices[oppositeIndex] = temp
  }
}

/**
 * Randomizes the slice of loops using Fisher-Yates shuffling.
 */
export const shuffleLoops = (loops: Loop[]) => {
  const n = loops.length
  for (let i = 0; i < n; i++) {
    const r = i + Math.floor(Math.random() * (n - i))
    const temp = loops[r]
    loops[r] = loops[i]
    loops[i] = temp
  }
}

/**
 * Creates the given number of nested regular loops around a common center point.
 * All loops will have the same number of vertices (at least minVertices).
 * Furthermore, the vertices at the same index position are collinear with the common center point of all the loops.
 * The loop radii decrease exponentially in order to prevent accidental loop crossings when one of the loops is modified.
 */
export const generatePolygonConcentricTestLoops = (numLoops: number, minVertices: number): Loop[] => {
  const loops: Loop[] = []
  const center = randomPoint()
  const numVertices = minVertices + randomUniformInt(10)
  for (let i = 0; i < numLoops; i++) {
    const radius = 80 * Math.pow(0.1, i) * DEGREE
    loops.push(Loop.regularLoop(center, radius, numVertices))
  }
  return loops
}

/**
 * Declares a function that can tweak a Polygon for testing.
 */
export type modifyPolygonFunc = (p: Polygon) => void

/**
 * Checks that a polygon is invalid by validating the polygon after applying a modification function.
 */
const checkPolygonInvalid = (label: string, loops: Loop[], initOriented: boolean, f: modifyPolygonFunc) => {
  shuffleLoops(loops)
  let polygon: Polygon
  if (initOriented) {
    polygon = Polygon.fromOrientedLoops(loops)
  } else {
    polygon = Polygon.fromLoops(loops)
  }

  if (f) {
    f(polygon)
  }

  notEqual(polygon.validate(), null, `${label}: ${polygon}.Validate() = null, want non-nil`)
}

/**
 * Given a pair of polygons where A contains B, check that various identities
 * involving union, intersection, and difference operations hold true.
 */
const testPolygonOneNestedPair = (a: Polygon, b: Polygon) => {
  ok(a.contains(b), `${a}.contains(${b}) = false, want true`)
  equal(a.intersects(b), !b.isEmpty(), `${a}.intersects(${b}) = ${a.intersects(b)}, want ${!b.isEmpty()}`)
  equal(b.intersects(a), !b.isEmpty(), `${b}.intersects(${a}) = ${b.intersects(a)}, want ${!b.isEmpty()}`)

  // TODO: Add the remaining checks related to construction via union, intersection, and difference.
}

/**
 * Given a pair of disjoint polygons A and B, check that various identities
 * involving union, intersection, and difference operations hold true.
 */
const testPolygonOneDisjointPair = (a: Polygon, b: Polygon) => {
  ok(!a.intersects(b), `${a}.intersects(${b}) = true, want false`)
  ok(!b.intersects(a), `${b}.intersects(${a}) = true, want false`)
  equal(a.contains(b), b.isEmpty(), `${a}.contains(${b}) = ${a.contains(b)}, want ${b.isEmpty()}`)
  equal(b.contains(a), a.isEmpty(), `${b}.contains(${a}) = ${b.contains(a)}, want ${a.isEmpty()}`)

  // TODO: Add the remaining checks related to construction via builder, union, intersection, and difference.
}

/**
 * Given polygons A and B whose union covers the sphere, check that various
 * identities involving union, intersection, and difference hold true.
 */
const testPolygonOneCoveringPair = (a: Polygon, b: Polygon) => {
  equal(a.contains(b), a.isFull(), `${a}.contains(${b}) = ${a.contains(b)}, want ${a.isFull()}`)
  equal(b.contains(a), b.isFull(), `${b}.contains(${a}) = ${b.contains(a)}, want ${b.isFull()}`)

  // TODO: Add the remaining checks related to construction via union.
}

/**
 * Given polygons A and B such that both A and its complement intersect both B
 * and its complement, check that various identities involving union,
 * intersection, and difference hold true.
 */
const testPolygonOneOverlappingPair = (a: Polygon, b: Polygon) => {
  ok(!a.contains(b), `${a}.contains(${b}) = true, want false`)
  ok(!b.contains(a), `${b}.contains(${a}) = true, want false`)
  ok(a.intersects(b), `${a}.intersects(${b}) = false, want true`)

  // TODO: Add the remaining checks related to construction via builder, union, intersection, and difference.
}

/**
 * Given a pair of polygons where A contains B, test various identities
 * involving A, B, and their complements.
 */
const testPolygonNestedPair = (a: Polygon, b: Polygon) => {
  // TODO: Uncomment once complement is completed
  // const a1 = InitToComplement(a)
  // const b1 = InitToComplement(b)

  testPolygonOneNestedPair(a, b)
  // testPolygonOneNestedPair(b1, a1)
  // testPolygonOneDisjointPair(a1, b)
  // testPolygonOneCoveringPair(a, b1)
}

/**
 * Given a pair of disjoint polygons A and B, test various identities
 * involving A, B, and their complements.
 */
const testPolygonDisjointPair = (a: Polygon, b: Polygon) => {
  // TODO: Uncomment once complement is completed
  // const a1 = InitToComplement(a)
  // const b1 = InitToComplement(b)

  testPolygonOneDisjointPair(a, b)
  // testPolygonOneCoveringPair(a1, b1)
  // testPolygonOneNestedPair(a1, b)
  // testPolygonOneNestedPair(b1, a)
}

/**
 * Given polygons A and B such that both A and its complement intersect both B
 * and its complement, test various identities involving these four polygons.
 */
const testPolygonOverlappingPair = (a: Polygon, b: Polygon) => {
  // TODO: Uncomment once complement is completed
  // const a1 = InitToComplement(a)
  // const b1 = InitToComplement(b)

  testPolygonOneOverlappingPair(a, b)
  // testPolygonOneOverlappingPair(a1, b1)
  // testPolygonOneOverlappingPair(a1, b)
  // testPolygonOneOverlappingPair(a, b1)
}

/**
 * Test identities that should hold for any pair of polygons A, B and their
 * complements.
 */
const testPolygonComplements = (a: Polygon, b: Polygon) => {
  // TODO: Uncomment once complement is completed
  // const a1 = InitToComplement(a)
  // const b1 = InitToComplement(b)
  // testOneComplementPair(a, a1, b, b1)
  // testOneComplementPair(a1, a, b, b1)
  // testOneComplementPair(a, a1, b1, b)
  // testOneComplementPair(a1, a, b1, b)
  // TODO: Add the checks related to construction via union, etc.
}

/**
 * Tests related to construction via union, etc.
 */
const testPolygonDestructiveUnion = (a: Polygon, b: Polygon) => {
  // TODO: Add the checks related to construction via union, etc.
}
