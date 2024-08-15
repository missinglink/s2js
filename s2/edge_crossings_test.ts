import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { oneIn, randomFloat64, randomFrame } from './testing'
import { DBL_EPSILON } from './predicates'
import { Point } from './Point'
import { Loop } from './Loop'

import * as matrix from './matrix3x3'
import * as angle from '../s1/angle'

import { intersectionExact, intersection, CROSS, angleContainsVertex, INTERSECTION_ERROR } from './edge_crossings'
import { distanceFromSegment } from './edge_distances'
import { EdgeCrosser } from './EdgeCrosser'
import { maxAngle } from './util'

// Constants for tests
const DISTANCE_ABS_ERROR = 3 * DBL_EPSILON

const testIntersectionExact = (a0: Point, a1: Point, b0: Point, b1: Point): Point => {
  let x = intersectionExact(a0, a1, b0, b1)
  if (x.vector.dot(a0.vector.add(a1.vector).add(b0.vector.add(b1.vector))) < 0) {
    x = Point.fromVector(x.vector.mul(-1))
  }
  return x
}

describe('s2.edge_crossings', () => {
  test('edge util intersection error', (t) => {
    let maxPointDist = 0
    let maxEdgeDist = 0

    for (let iter = 0; iter < 5000; iter++) {
      const f = randomFrame()
      const p = matrix.col(f, 0)
      let d1 = matrix.col(f, 1)
      let d2 = matrix.col(f, 2)

      const slope = 1e-15 * Math.pow(1e30, randomFloat64())
      d2 = Point.fromVector(d1.vector.add(d2.vector.mul(slope)).normalize())
      let a: Point, b: Point, c: Point, d: Point

      for (;;) {
        const abLen = Math.pow(1e-15, randomFloat64())
        const cdLen = Math.pow(1e-15, randomFloat64())
        let aFraction = Math.pow(1e-5, randomFloat64())
        if (oneIn(2)) aFraction = 1 - aFraction
        let cFraction = Math.pow(1e-5, randomFloat64())
        if (oneIn(2)) cFraction = 1 - cFraction
        a = Point.fromVector(p.vector.sub(d1.vector.mul(aFraction * abLen)).normalize())
        b = Point.fromVector(p.vector.add(d1.vector.mul((1 - aFraction) * abLen)).normalize())
        c = Point.fromVector(p.vector.sub(d2.vector.mul(cFraction * cdLen)).normalize())
        d = Point.fromVector(p.vector.add(d2.vector.mul((1 - cFraction) * cdLen)).normalize())
        if (new EdgeCrosser(a, b).crossingSign(c, d) === CROSS) break
      }

      ok(distanceFromSegment(p, a, b) <= 1.5 * DBL_EPSILON + DISTANCE_ABS_ERROR)
      ok(distanceFromSegment(p, c, d) <= 1.5 * DBL_EPSILON + DISTANCE_ABS_ERROR)

      const expected = testIntersectionExact(a, b, c, d)
      ok(distanceFromSegment(expected, a, b) <= 3 * DBL_EPSILON + DISTANCE_ABS_ERROR)
      ok(distanceFromSegment(expected, c, d) <= 3 * DBL_EPSILON + DISTANCE_ABS_ERROR)
      ok(expected.distance(p) <= (3 * DBL_EPSILON) / slope + INTERSECTION_ERROR)

      const actual = intersection(a, b, c, d)
      const distAB = distanceFromSegment(actual, a, b)
      const distCD = distanceFromSegment(actual, c, d)
      const pointDist = expected.distance(actual)
      ok(distAB <= INTERSECTION_ERROR + DISTANCE_ABS_ERROR)
      ok(distCD <= INTERSECTION_ERROR + DISTANCE_ABS_ERROR)
      ok(pointDist <= INTERSECTION_ERROR)

      maxEdgeDist = maxAngle(maxEdgeDist, maxAngle(distAB, distCD))
      maxPointDist = maxAngle(maxPointDist, pointDist)
    }
  })

  test('angleContainsVertex', (t) => {
    const a = Point.fromCoords(1, 0, 0)
    const b = Point.fromCoords(0, 1, 0)
    const refB = b.referenceDir()

    ok(!angleContainsVertex(a, b, a))
    ok(angleContainsVertex(refB, b, a))
    ok(!angleContainsVertex(a, b, refB))

    const loop = Loop.regularLoop(b, angle.degrees(10), 10)
    let count = 0
    for (let i = 0; i < loop.vertices.length; i++) {
      const v = loop.vertices[i]
      if (angleContainsVertex(loop.vertex((i + 1) % loop.vertices.length), b, v)) {
        count++
      }
    }
    equal(count, 1)
  })
})
