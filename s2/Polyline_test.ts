import { test, describe } from 'node:test'
import { deepEqual, equal, notEqual, ok } from 'node:assert/strict'
import { Polyline } from './Polyline'
import { Rect } from './Rect'
import { LatLng } from './LatLng'
import { Point } from './Point'
import { float64Eq, randomFloat64, randomFrame } from './testing'
import * as matrix from './matrix3x3'
import * as cellid from './cellid'
import { Cell } from './Cell'
import { DEGREE } from '../s1/angle_constants'
import { makePolyline } from './testing_textformat'

describe('s2.Polyline', () => {
  test('basics', () => {
    const empty = new Polyline([])
    deepEqual(empty.rectBound(), Rect.emptyRect())
    equal(empty.points.length, 0)

    empty.reverse()
    equal(empty.points.length, 0)

    const latlngs = [LatLng.fromDegrees(0, 0), LatLng.fromDegrees(0, 90), LatLng.fromDegrees(0, 180)]

    const semiEquator = Polyline.fromLatLngs(latlngs)
    const want = Point.fromCoords(0, 1, 0)
    const [got] = semiEquator.interpolate(0.5)
    ok(got.approxEqual(want))

    semiEquator.reverse()
    ok(semiEquator.points[2].approxEqual(Point.fromCoords(1, 0, 0)))
  })

  test('shape', () => {
    const shape = makePolyline('0:0, 1:0, 1:1, 2:1')
    equal(shape.numEdges(), 3)
    equal(shape.numChains(), 1)
    equal(shape.chain(0).start, 0)
    equal(shape.chain(0).length, 3)

    const e = shape.edge(2)
    ok(Point.fromLatLng(LatLng.fromDegrees(1, 1)).approxEqual(e.v0))
    ok(Point.fromLatLng(LatLng.fromDegrees(2, 1)).approxEqual(e.v1))
    ok(!shape.referencePoint().contained)
    equal(shape.dimension(), 1)
  })

  test('empty', () => {
    const shape = new Polyline([])
    equal(shape.numEdges(), 0)
    equal(shape.numChains(), 0)
    ok(shape.isEmpty())
    ok(!shape.isFull())
    ok(!shape.referencePoint().contained)
  })

  test('length and centroid', () => {
    for (let i = 0; i < 100; i++) {
      const f = randomFrame()

      let line = new Polyline([])

      for (let theta = 0; theta < 2 * Math.PI; theta += Math.pow(randomFloat64(), 10)) {
        const p = Point.fromVector(
          matrix
            .row(f, 0)
            .vector.mul(Math.cos(theta))
            .add(matrix.row(f, 1).vector.mul(Math.sin(theta)))
        )
        if (line.points.length === 0 || !p.approxEqual(line.points[line.points.length - 1])) {
          line.points.push(p)
        }
      }

      line.points.push(line.points[0])

      const length = line.length()
      ok(Math.abs(length - 2 * Math.PI) < 2e-14)

      const centroid = line.centroid()
      ok(centroid.vector.norm() < 2e-14)
    }
  })

  test('intersectsCell', () => {
    const pline = new Polyline([
      Point.fromVector(new Point(1, -1.1, 0.8).vector.normalize()),
      Point.fromVector(new Point(1, -0.8, 1.1).vector.normalize())
    ])

    for (let face = 0; face < 6; face++) {
      const cell = Cell.fromCellID(cellid.fromFace(face))
      equal(pline.intersectsCell(cell), face % 2 === 0)
    }
  })

  test('subsample', () => {
    const polyStr = '0:0, 0:1, -1:2, 0:3, 0:4, 1:4, 2:4.5, 3:4, 3.5:4, 4:4'

    const tests = [
      { have: '', tolerance: 1.0, want: [] },
      { have: '0:1', tolerance: 1.0, want: [0] },
      { have: '10:10, 11:11', tolerance: 5.0, want: [0, 1] },
      { have: '-1:0, 0:0, 1:0', tolerance: 1e-15, want: [0, 2] },
      { have: '-1:0, 0:0, 1:1', tolerance: 0.0, want: [0, 1, 2] },
      { have: '-1:0, 0:0, 1:1', tolerance: -1.0, want: [0, 1, 2] },
      { have: '0:1, 0:2, 0:3, 0:4, 0:5', tolerance: 1.0, want: [0, 4] },
      { have: '0:1, 0:1, 0:1, 0:2', tolerance: 0.0, want: [0, 3] },
      { have: polyStr, tolerance: 3.0, want: [0, 9] },
      { have: polyStr, tolerance: 2.0, want: [0, 6, 9] },
      { have: polyStr, tolerance: 0.9, want: [0, 2, 6, 9] },
      { have: polyStr, tolerance: 0.4, want: [0, 1, 2, 3, 4, 6, 9] },
      { have: polyStr, tolerance: 0, want: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { have: '10:10, 12:12, 10:10', tolerance: 5.0, want: [0] },
      { have: '0:0, 1:1, 0:0, 0:120, 0:130', tolerance: 5.0, want: [0, 3, 4] },
      { have: '90:0, 50:180, 20:180, -20:180, -50:180, -90:0, 30:0, 90:0', tolerance: 5.0, want: [0, 2, 4, 5, 6, 7] },
      { have: '10:10, 10:20, 10:30, 10:15, 10:40', tolerance: 5.0, want: [0, 2, 3, 4] },
      { have: '10:10, 10:20, 10:30, 10:10, 10:30, 10:40', tolerance: 5.0, want: [0, 2, 3, 5] },
      { have: '10:10, 12:12, 9:9, 10:20, 10:30', tolerance: 5.0, want: [0, 4] }
    ]

    tests.forEach((test) => {
      const p = makePolyline(test.have)
      const got = p.subsampleVertices(test.tolerance * DEGREE)
      deepEqual(got, test.want)
    })
  })

  test('project', () => {
    const latlngs = [
      LatLng.fromDegrees(0, 0),
      LatLng.fromDegrees(0, 1),
      LatLng.fromDegrees(0, 2),
      LatLng.fromDegrees(1, 2)
    ]

    const line = Polyline.fromLatLngs(latlngs)

    const tests = [
      { haveLatLng: LatLng.fromDegrees(0.5, -0.5), wantProjection: LatLng.fromDegrees(0, 0), wantNext: 1 },
      { haveLatLng: LatLng.fromDegrees(0.5, 0.5), wantProjection: LatLng.fromDegrees(0, 0.5), wantNext: 1 },
      { haveLatLng: LatLng.fromDegrees(0.5, 1), wantProjection: LatLng.fromDegrees(0, 1), wantNext: 2 },
      { haveLatLng: LatLng.fromDegrees(-0.5, 2.5), wantProjection: LatLng.fromDegrees(0, 2), wantNext: 3 },
      { haveLatLng: LatLng.fromDegrees(2, 2), wantProjection: LatLng.fromDegrees(1, 2), wantNext: 4 },
      { haveLatLng: LatLng.fromDegrees(-50, 0.5), wantProjection: LatLng.fromDegrees(0, 0.5), wantNext: 1 }
    ]

    tests.forEach((test) => {
      const [projection, next] = line.project(Point.fromLatLng(test.haveLatLng))
      ok(Point.fromLatLng(test.wantProjection).approxEqual(projection))
      equal(next, test.wantNext)
    })
  })

  test('isOnRight', () => {
    let latlngs = [
      LatLng.fromDegrees(0, 0),
      LatLng.fromDegrees(0, 1),
      LatLng.fromDegrees(0, 2),
      LatLng.fromDegrees(1, 2)
    ]
    const line1 = Polyline.fromLatLngs(latlngs)

    latlngs = [LatLng.fromDegrees(0, 0), LatLng.fromDegrees(0, 1), LatLng.fromDegrees(-1, 0)]
    const line2 = Polyline.fromLatLngs(latlngs)

    const tests = [
      { line: line1, haveLatLng: LatLng.fromDegrees(-0.5, 0.5), wantOnRight: true },
      { line: line1, haveLatLng: LatLng.fromDegrees(0.5, -0.5), wantOnRight: false },
      { line: line1, haveLatLng: LatLng.fromDegrees(0.5, 0.5), wantOnRight: false },
      { line: line1, haveLatLng: LatLng.fromDegrees(0.5, 1.0), wantOnRight: false },
      { line: line1, haveLatLng: LatLng.fromDegrees(-0.5, 2.5), wantOnRight: true },
      { line: line1, haveLatLng: LatLng.fromDegrees(1.5, 2.5), wantOnRight: true },
      { line: line2, haveLatLng: LatLng.fromDegrees(-0.5, 5.0), wantOnRight: false },
      { line: line2, haveLatLng: LatLng.fromDegrees(5.5, 5.0), wantOnRight: false }
    ]

    tests.forEach((test) => {
      const onRight = test.line.isOnRight(Point.fromLatLng(test.haveLatLng))
      equal(onRight, test.wantOnRight)
    })
  })

  test('validate', () => {
    let p = makePolyline('0:0, 2:1, 0:2, 2:3, 0:4, 2:5, 0:6')
    equal(p.validate(), null)

    const p1 = new Polyline([Point.fromCoords(0, 1, 0), new Point(10, 3, 7), Point.fromCoords(0, 0, 1)])
    notEqual(p1.validate(), null)

    const p2 = new Polyline([
      Point.fromCoords(0, 1, 0),
      Point.fromCoords(0, 0, 1),
      Point.fromCoords(0, 0, 1),
      Point.fromCoords(1, 0, 0)
    ])
    notEqual(p2.validate(), null)

    const pt = Point.fromCoords(1, 1, 0)
    const antiPt = Point.fromVector(pt.vector.mul(-1))

    const p3 = new Polyline([Point.fromCoords(0, 1, 0), pt, Point.fromCoords(0, 0, 1), antiPt])
    equal(p3.validate(), null)

    const p4 = new Polyline([Point.fromCoords(0, 1, 0), Point.fromCoords(0, 0, 1), pt, antiPt])
    notEqual(p4.validate(), null)
  })

  test('intersects', () => {
    const empty = new Polyline([])
    const line = makePolyline('1:1, 4:4')
    ok(!empty.intersects(line))

    // PolylineIntersectsOnePointPolyline
    const line1 = makePolyline('1:1, 4:4')
    const line2 = makePolyline('1:1')
    ok(!line1.intersects(line2))

    // PolylineIntersects
    const line3 = makePolyline('1:1, 4:4')
    const smallCrossing = makePolyline('1:2, 2:1')
    const smallNoncrossing = makePolyline('1:2, 2:3')
    const bigCrossing = makePolyline('1:2, 2:3, 4:3')
    ok(line3.intersects(smallCrossing))
    ok(!line3.intersects(smallNoncrossing))
    ok(line3.intersects(bigCrossing))

    // PolylineIntersectsAtVertex
    const line4 = makePolyline('1:1, 4:4, 4:6')
    const line5 = makePolyline('1:1, 1:2')
    const line6 = makePolyline('5:1, 4:4, 2:2')
    ok(line4.intersects(line5))
    ok(line4.intersects(line6))

    // TestPolylineIntersectsVertexOnEdge
    const horizontalLeftToRight = makePolyline('0:1, 0:3')
    const verticalBottomToTop = makePolyline('-1:2, 0:2, 1:2')
    const horizontalRightToLeft = makePolyline('0:3, 0:1')
    const verticalTopToBottom = makePolyline('1:2, 0:2, -1:2')

    ok(horizontalLeftToRight.intersects(verticalBottomToTop))
    ok(horizontalLeftToRight.intersects(verticalTopToBottom))
    ok(horizontalRightToLeft.intersects(verticalBottomToTop))
    ok(horizontalRightToLeft.intersects(verticalTopToBottom))
  })

  test('approxEqual', () => {
    const tests = [
      {
        a: '0:0, 0:10, 5:5',
        b: '0:0.1, -0.1:9.9, 5:5.2',
        maxError: 0.5 * DEGREE,
        want: true
      },
      {
        a: '0:0, 0:10, 5:5',
        b: '0:0.1, -0.1:9.9, 5:5.2',
        maxError: 0.01 * DEGREE,
        want: false
      },
      {
        a: '0:0, 0:10, 0:20',
        b: '0:0, 0:20',
        maxError: 0.1 * DEGREE,
        want: false
      },
      {
        a: '0:0, 5:5, 0:10',
        b: '5:5, 0:10, 0:0',
        maxError: 0.1 * DEGREE,
        want: false
      }
    ]

    tests.forEach((test) => {
      const a = makePolyline(test.a)
      const b = makePolyline(test.b)
      equal(a.approxEqual(b, test.maxError), test.want)
    })
  })

  test('interpolate', () => {
    const vertices = [
      Point.fromCoords(1, 0, 0),
      Point.fromCoords(0, 1, 0),
      Point.fromCoords(0, 1, 1),
      Point.fromCoords(0, 0, 1)
    ]

    const line = new Polyline(vertices)

    let [point, next] = line.interpolate(-0.1)
    equal(point, vertices[0])
    equal(next, 1)

    let want = Point.fromCoords(1, Math.tan((0.2 * Math.PI) / 2.0), 0)
    ;[point] = line.interpolate(0.1)
    ok(point.approxEqual(want))

    want = Point.fromCoords(1, 1, 0)
    ;[point] = line.interpolate(0.25)
    ok(point.approxEqual(want))

    want = vertices[1]
    ;[point] = line.interpolate(0.5)
    deepEqual(point, want)

    want = vertices[2]
    ;[point, next] = line.interpolate(0.75)
    ok(point.approxEqual(want))
    equal(next, 3)
    ;[point, next] = line.interpolate(1.1)
    equal(point, vertices[3])
    equal(next, 4)

    const vertices2 = [Point.fromCoords(1, 1, 1), Point.fromCoords(1, 1, 1 + 1e-15), Point.fromCoords(1, 1, 1 + 2e-15)]
    const shortLine = new Polyline(vertices2)

    ;[point, next] = shortLine.interpolate(1.0 - 2e-16)
    deepEqual(point, vertices2[2])
    equal(next, 3)
  })

  test('uninterpolate', () => {
    let vertices = [Point.fromCoords(1, 0, 0)]
    let line = new Polyline(vertices)
    ok(float64Eq(line.uninterpolate(Point.fromCoords(0, 1, 0), 1), 0.0))

    vertices = vertices.concat([Point.fromCoords(0, 1, 0), Point.fromCoords(0, 1, 1), Point.fromCoords(0, 0, 1)])
    line = new Polyline(vertices)

    let [interpolated, nextVertex] = line.interpolate(-0.1)
    ok(float64Eq(line.uninterpolate(interpolated, nextVertex), 0.0))
    ;[interpolated, nextVertex] = line.interpolate(0.0)
    ok(float64Eq(line.uninterpolate(interpolated, nextVertex), 0.0))
    ;[interpolated, nextVertex] = line.interpolate(0.5)
    ok(float64Eq(line.uninterpolate(interpolated, nextVertex), 0.5))
    ;[interpolated, nextVertex] = line.interpolate(0.75)
    ok(float64Eq(line.uninterpolate(interpolated, nextVertex), 0.75))
    ;[interpolated, nextVertex] = line.interpolate(1.1)
    ok(float64Eq(line.uninterpolate(interpolated, nextVertex), 1.0))

    ok(float64Eq(line.uninterpolate(Point.fromCoords(0, 1, 0), line.points.length), 1.0))
  })
})
