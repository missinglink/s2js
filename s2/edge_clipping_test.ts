import { test, describe } from 'node:test'
import { equal, ok, notEqual } from 'node:assert/strict'
import { Point } from './Point'
import { Point as R2Point } from '../r2/Point'
import { Rect as R2Rect } from '../r2/Rect'
import { Interval as R1Interval } from '../r1/Interval'
import { Interval as S1Interval } from '../s1/Interval'
import { faceUVToXYZ } from './stuv'
import { nextAfter } from '../r1/math'
import {
  AXIS_U,
  AXIS_V,
  clipEdge,
  clipEdgeBound,
  clippedEdgeBound,
  clipToPaddedFace,
  EDGE_CLIP_ERROR_UV_DIST,
  edgeIntersectsRect,
  FACE_CLIP_ERROR_RADIANS,
  faceSegments,
  INTERSECTS_RECT_ERROR_UV_DIST,
  PointUVW
} from './edge_clipping'
import {
  float64Eq,
  oneIn,
  perturbedCornerOrMidpoint,
  r2PointsApproxEqual,
  randomFloat64,
  randomUniformFloat64,
  randomUniformInt
} from './testing'

describe('s2.edge_clipping', () => {
  test('EdgeClippingIntersectsFace', () => {
    const tests = [
      { a: new PointUVW(new Point(2.05335e-6, 3.91604e-22, 2.90553e-6)), want: false },
      { a: new PointUVW(new Point(-3.91604e-22, -2.05335e-6, -2.90553e-6)), want: false },
      { a: new PointUVW(new Point(0.169258, -0.169258, 0.664013)), want: false },
      { a: new PointUVW(new Point(0.169258, -0.169258, -0.664013)), want: false },
      { a: new PointUVW(new Point(Math.sqrt(2.0 / 3.0), -Math.sqrt(2.0 / 3.0), 3.88578e-16)), want: true },
      { a: new PointUVW(new Point(-3.88578e-16, -Math.sqrt(2.0 / 3.0), Math.sqrt(2.0 / 3.0))), want: true }
    ]

    tests.forEach((test) => {
      const got = test.a.intersectsFace()
      equal(got, test.want)
    })
  })

  test('EdgeClippingIntersectsOppositeEdges', () => {
    const tests = [
      { a: new PointUVW(new Point(0.169258, -0.169258, 0.664013)), want: false },
      { a: new PointUVW(new Point(0.169258, -0.169258, -0.664013)), want: false },
      { a: new PointUVW(new Point(-Math.sqrt(4.0 / 3.0), 0, -Math.sqrt(4.0 / 3.0))), want: true },
      { a: new PointUVW(new Point(Math.sqrt(4.0 / 3.0), 0, Math.sqrt(4.0 / 3.0))), want: true },
      { a: new PointUVW(new Point(-Math.sqrt(2.0 / 3.0), -Math.sqrt(2.0 / 3.0), 1.66533453694e-16)), want: false },
      { a: new PointUVW(new Point(Math.sqrt(2.0 / 3.0), Math.sqrt(2.0 / 3.0), -1.66533453694e-16)), want: false }
    ]

    tests.forEach((test) => {
      const got = test.a.intersectsOppositeEdges()
      equal(got, test.want)
    })
  })

  test('EdgeClippingExitAxis', () => {
    const tests = [
      { a: new PointUVW(new Point(0, -Math.sqrt(2.0 / 3.0), Math.sqrt(2.0 / 3.0))), want: AXIS_U },
      { a: new PointUVW(new Point(0, Math.sqrt(4.0 / 3.0), -Math.sqrt(4.0 / 3.0))), want: AXIS_U },
      { a: new PointUVW(new Point(-Math.sqrt(4.0 / 3.0), -Math.sqrt(4.0 / 3.0), 0)), want: AXIS_V },
      { a: new PointUVW(new Point(Math.sqrt(4.0 / 3.0), Math.sqrt(4.0 / 3.0), 0)), want: AXIS_V },
      { a: new PointUVW(new Point(Math.sqrt(2.0 / 3.0), -Math.sqrt(2.0 / 3.0), 0)), want: AXIS_V },
      { a: new PointUVW(new Point(1.67968702783622, 0, 0.870988820096491)), want: AXIS_V },
      { a: new PointUVW(new Point(0, Math.sqrt(2), Math.sqrt(2))), want: AXIS_U }
    ]

    tests.forEach((test) => {
      const got = test.a.exitAxis()
      equal(got, test.want)
    })
  })

  test('EdgeClippingExitPoint', () => {
    const tests = [
      {
        a: new PointUVW(new Point(-3.88578058618805e-16, -Math.sqrt(2.0 / 3.0), Math.sqrt(2.0 / 3.0))),
        exitAxis: AXIS_U,
        want: new R2Point(-1, 1)
      },
      {
        a: new PointUVW(new Point(Math.sqrt(4.0 / 3.0), -Math.sqrt(4.0 / 3.0), 0)),
        exitAxis: AXIS_V,
        want: new R2Point(-1, -1)
      },
      {
        a: new PointUVW(new Point(-Math.sqrt(4.0 / 3.0), -Math.sqrt(4.0 / 3.0), 0)),
        exitAxis: AXIS_V,
        want: new R2Point(-1, 1)
      },
      {
        a: new PointUVW(new Point(-6.66134e-16, Math.sqrt(4.0 / 3.0), -Math.sqrt(4.0 / 3.0))),
        exitAxis: AXIS_U,
        want: new R2Point(1, 1)
      }
    ]

    tests.forEach((test) => {
      const got = test.a.exitPoint(test.exitAxis)
      ok(r2PointsApproxEqual(got, test.want))
    })
  })

  const testClipToPaddedFace = (a: Point, b: Point) => {
    a = Point.fromVector(a.vector.normalize())
    b = Point.fromVector(b.vector.normalize())
    if (a.vector.equals(b.vector.mul(-1))) return

    const segments = faceSegments(a, b)
    const n = segments.length
    ok(n > 0, `faceSegments(${a}, ${b}) should have generated at least one entry`)

    const BIUNIT = new R2Rect(new R1Interval(-1, 1), new R1Interval(-1, 1))
    const ERROR_RADIANS = FACE_CLIP_ERROR_RADIANS

    const aPrime = faceUVToXYZ(segments[0].face, segments[0].a.x, segments[0].a.y)

    ok(a.vector.angle(aPrime) <= ERROR_RADIANS)

    const bPrime = faceUVToXYZ(segments[n - 1].face, segments[n - 1].b.x, segments[n - 1].b.y)
    ok(b.vector.angle(bPrime) <= ERROR_RADIANS)

    const norm = Point.fromVector(a.pointCross(b).vector.normalize())
    const aTan = Point.fromVector(norm.vector.cross(a.vector))
    const bTan = Point.fromVector(b.vector.cross(norm.vector))

    segments.forEach((segment, i) => {
      ok(BIUNIT.containsPoint(segment.a))
      ok(BIUNIT.containsPoint(segment.b))

      if (i > 0) {
        notEqual(segments[i - 1].face, segment.face)

        const prevSegmentXYZ = faceUVToXYZ(segments[i - 1].face, segments[i - 1].b.x, segments[i - 1].b.y)
        const currentSegmentXYZ = faceUVToXYZ(segment.face, segment.a.x, segment.a.y)
        ok(prevSegmentXYZ.approxEqual(currentSegmentXYZ))

        const p = faceUVToXYZ(segment.face, segment.a.x, segment.a.y).normalize()
        ok(Math.abs(p.dot(norm.vector)) <= ERROR_RADIANS)
        ok(p.dot(aTan.vector) >= -ERROR_RADIANS)
        ok(p.dot(bTan.vector) >= -ERROR_RADIANS)
      }
    })

    let padding = 0.0
    if (!oneIn(10)) {
      padding = 1e-10 * Math.pow(1e-5, randomFloat64())
    }

    const xAxis = a
    const yAxis = aTan
    let expectedAngles = new S1Interval(0, a.vector.angle(b.vector))

    if (expectedAngles.isInverted()) {
      expectedAngles = new S1Interval(expectedAngles.hi, expectedAngles.lo)
    }

    const maxAngles = expectedAngles.expanded(ERROR_RADIANS)
    let actualAngles = new S1Interval(0, 0)

    for (let face = 0; face < 6; face++) {
      const [aUV, bUV, intersects] = clipToPaddedFace(a, b, face, padding)
      if (!intersects) continue

      ok(aUV)
      ok(bUV)
      const aClip = Point.fromVector(faceUVToXYZ(face, aUV.x, aUV.y).normalize())
      const bClip = Point.fromVector(faceUVToXYZ(face, bUV.x, bUV.y).normalize())

      const desc = `on face ${face}, a=${a}, b=${b}, aClip=${aClip}, bClip=${bClip}`

      ok(Math.abs(aClip.vector.dot(norm.vector)) <= ERROR_RADIANS)
      ok(Math.abs(bClip.vector.dot(norm.vector)) <= ERROR_RADIANS)

      if (aClip.vector.angle(a.vector) > ERROR_RADIANS) {
        const got = Math.max(Math.abs(aUV.x), Math.abs(aUV.y))
        ok(float64Eq(got, 1 + padding))
      }

      if (bClip.vector.angle(b.vector) > ERROR_RADIANS) {
        const got = Math.max(Math.abs(bUV.x), Math.abs(bUV.y))
        ok(float64Eq(got, 1 + padding))
      }

      const aAngle = Math.atan2(aClip.vector.dot(yAxis.vector), aClip.vector.dot(xAxis.vector))
      const bAngle = Math.atan2(bClip.vector.dot(yAxis.vector), bClip.vector.dot(xAxis.vector))

      let faceAngles = S1Interval.fromEndpoints(aAngle, bAngle)
      if (faceAngles.isInverted()) {
        faceAngles = new S1Interval(faceAngles.hi, faceAngles.lo)
      }

      ok(maxAngles.containsInterval(faceAngles))
      actualAngles = actualAngles.union(faceAngles)
    }

    ok(actualAngles.expanded(ERROR_RADIANS).containsInterval(expectedAngles))
  }

  test('EdgeClippingClipToPaddedFace', () => {
    const simpleCases = [
      [new Point(1, -0.5, -0.5), new Point(1, 0.5, 0.5)],
      [new Point(1, 0.5, 0.5), new Point(1, -0.5, -0.5)],
      [new Point(1, 0, 0), new Point(0, 1, 0)],
      [new Point(0, 1, 0), new Point(1, 0, 0)],
      [new Point(0.75, 0, -1), new Point(0.75, 0, 1)],
      [new Point(0.75, 0, 1), new Point(0.75, 0, -1)],
      [new Point(1, 0, 0.75), new Point(0, 1, 0.75)],
      [new Point(0, 1, 0.75), new Point(1, 0, 0.75)],
      [new Point(1, 0.9, 0.95), new Point(-1, 0.95, 0.9)],
      [new Point(-1, 0.95, 0.9), new Point(1, 0.9, 0.95)]
    ]

    simpleCases.forEach(([a, b]) => {
      testClipToPaddedFace(a, b)
    })

    const BIUNIT = new R2Rect(new R1Interval(-1, 1), new R1Interval(-1, 1))

    for (let i = 0; i < 1000; i++) {
      const face = randomUniformInt(6)
      const i = randomUniformInt(4)
      const j = (i + 1) & 3
      const p = Point.fromVector(faceUVToXYZ(face, BIUNIT.vertices()[i].x, BIUNIT.vertices()[i].y))
      const q = Point.fromVector(faceUVToXYZ(face, BIUNIT.vertices()[j].x, BIUNIT.vertices()[j].y))

      const a = perturbedCornerOrMidpoint(p, q)
      const b = perturbedCornerOrMidpoint(p, q)
      testClipToPaddedFace(a, b)
    }
  })

  test('EdgeClippingClipEdge', () => {
    const ERROR_DIST = EDGE_CLIP_ERROR_UV_DIST + INTERSECTS_RECT_ERROR_UV_DIST
    const testRects = [
      R2Rect.fromPoints(
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1)),
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
      ),
      R2Rect.fromPoints(
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1)),
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
      ),
      R2Rect.fromPoints(
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1)),
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
      ),
      R2Rect.fromPoints(
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1)),
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
      ),
      R2Rect.fromPoints(
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1)),
        new R2Point(randomUniformFloat64(-1, 1), randomUniformFloat64(-1, 1))
      ),
      new R2Rect(new R1Interval(-0.7, -0.7), new R1Interval(0.3, 0.35)),
      new R2Rect(new R1Interval(0.2, 0.5), new R1Interval(0.3, 0.3)),
      new R2Rect(new R1Interval(-0.7, 0.3), new R1Interval(0, 0)),
      R2Rect.fromPoints(new R2Point(0.3, 0.8)),
      R2Rect.empty()
    ]

    testRects.forEach((r) => {
      for (let i = 0; i < 1000; i++) {
        const a = chooseRectEndpoint(r)
        const b = chooseRectEndpoint(r)

        const [aClip, bClip, intersects] = clipEdge(a, b, r)
        if (!intersects) {
          ok(!edgeIntersectsRect(a, b, r.expandedByMargin(-ERROR_DIST)))
        } else {
          ok(edgeIntersectsRect(a, b, r.expandedByMargin(ERROR_DIST)))

          ok(aClip)
          ok(bClip)
          const gotA = getFraction(aClip, a, b)
          const gotB = getFraction(bClip, a, b)
          ok(gotA <= gotB)

          checkPointOnBoundary(aClip, a, r)
          checkPointOnBoundary(bClip, b, r)
        }

        const initialClip = R2Rect.fromPoints(choosePointInRect(a, b), choosePointInRect(a, b))
        let bound = clippedEdgeBound(a, b, initialClip)
        if (bound.isEmpty()) continue

        const maxBound = bound.intersection(r)
        const [newBound, newIntersects] = clipEdgeBound(a, b, r, bound)

        if (!newIntersects) {
          ok(!edgeIntersectsRect(a, b, maxBound.expandedByMargin(-ERROR_DIST)))
        } else {
          ok(edgeIntersectsRect(a, b, maxBound.expandedByMargin(ERROR_DIST)))

          const ai = a.x > b.x ? 1 : 0
          const aj = a.y > b.y ? 1 : 0
          checkPointOnBoundary(newBound.vertexIJ(ai, aj), a, maxBound)
          checkPointOnBoundary(newBound.vertexIJ(1 - ai, 1 - aj), b, maxBound)
        }
      }
    })
  })
})

function getFraction(x: R2Point, a: R2Point, b: R2Point): number {
  const ERROR_DIST = EDGE_CLIP_ERROR_UV_DIST + INTERSECTS_RECT_ERROR_UV_DIST
  if (a === b) return 0.0
  const dir = b.sub(a).normalize()
  ok(Math.abs(x.sub(a).dot(dir.ortho())) <= ERROR_DIST)
  return x.sub(a).dot(dir)
}

function randomPointFromInterval(clip: R1Interval): number {
  if (oneIn(5)) return oneIn(2) ? clip.lo : clip.hi
  switch (randomUniformInt(3)) {
    case 0:
      return clip.lo - randomFloat64()
    case 1:
      return clip.hi + randomFloat64()
    default:
      return clip.lo + randomFloat64() * clip.length()
  }
}

export const choosePointInRect = (a: R2Point, b: R2Point): R2Point => {
  if (oneIn(5)) return oneIn(2) ? a : b
  if (oneIn(3)) return a.add(b.sub(a).mul(randomFloat64()))
  return new R2Point(randomUniformFloat64(a.x, b.x), randomUniformFloat64(a.y, b.y))
}

function chooseRectEndpoint(clip: R2Rect): R2Point {
  if (oneIn(10)) {
    // Return a point on one of the two extended diagonals.
    const diag = randomUniformInt(2)
    const t = randomUniformFloat64(-1, 2)
    return clip
      .vertices()
      [diag].mul(1 - t)
      .add(clip.vertices()[diag + 2].mul(t))
  }

  return new R2Point(randomPointFromInterval(clip.x), randomPointFromInterval(clip.y))
}

function checkPointOnBoundary(p: R2Point, a: R2Point, clip: R2Rect): void {
  ok(clip.containsPoint(p), `${clip}.containsPoint(${p}) = false, want true`)

  if (!p.equals(a)) {
    const p1 = new R2Point(nextAfter(p.x, a.x), nextAfter(p.y, a.y))
    ok(!clip.containsPoint(p1), `${clip}.containsPoint(${p1}) = true, want false`)
  }
}
