import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { Interval } from './Interval'
import * as angle from './angle'
import { RADIAN } from './angle_constants'
import { DBL_EPSILON } from './Interval_constants'

// Some standard intervals for use throughout the tests.
// These include the intervals spanning one or more "quadrants" which are
// numbered as follows:
//
//  QUAD1 == [0, π/2]
//  QUAD2 == [π/2, π]
//  QUAD3 == [-π, -π/2]
//  QUAD4 == [-π/2, 0]
const EMPTY = Interval.emptyInterval()
const FULL = Interval.fullInterval()

// Single-point intervals:
const ZERO = Interval.fromEndpoints(0, 0)
const PI2 = Interval.fromEndpoints(Math.PI / 2, Math.PI / 2)
const PI = Interval.fromEndpoints(Math.PI, Math.PI)
const MIPI = Interval.fromEndpoints(-Math.PI, -Math.PI) // same as PI after normalization
const MIPI2 = Interval.fromEndpoints(-Math.PI / 2, -Math.PI / 2)

// Single quadrants:
const QUAD1 = Interval.fromEndpoints(0, Math.PI / 2)
const QUAD2 = Interval.fromEndpoints(Math.PI / 2, -Math.PI) // equivalent to (π/2, π)
const QUAD3 = Interval.fromEndpoints(Math.PI, -Math.PI / 2)
const QUAD4 = Interval.fromEndpoints(-Math.PI / 2, 0)

// Quadrant pairs:
const QUAD12 = Interval.fromEndpoints(0, -Math.PI)
const QUAD23 = Interval.fromEndpoints(Math.PI / 2, -Math.PI / 2)
const QUAD34 = Interval.fromEndpoints(-Math.PI, 0)
const QUAD41 = Interval.fromEndpoints(-Math.PI / 2, Math.PI / 2)

// Quadrant triples:
const QUAD123 = Interval.fromEndpoints(0, -Math.PI / 2)
const QUAD234 = Interval.fromEndpoints(Math.PI / 2, 0)
const QUAD341 = Interval.fromEndpoints(Math.PI, Math.PI / 2)
const QUAD412 = Interval.fromEndpoints(-Math.PI / 2, -Math.PI)

// Small intervals around the midpoints between quadrants,
// such that the center of each interval is offset slightly CCW from the midpoint.
const MID12 = Interval.fromEndpoints(Math.PI / 2 - 0.01, Math.PI / 2 + 0.02)
const MID23 = Interval.fromEndpoints(Math.PI - 0.01, -Math.PI + 0.02)
const MID34 = Interval.fromEndpoints(-Math.PI / 2 - 0.01, -Math.PI / 2 + 0.02)
const MID41 = Interval.fromEndpoints(-0.01, 0.02)

describe('s1.Interval', () => {
  test('constructors', () => {
    // Check that [-π,-π] is normalized to [π,π].
    equal(MIPI.lo, Math.PI)
    equal(MIPI.hi, Math.PI)

    const i = new Interval(0, 0)
    ok(i.isValid())
  })

  test('fromPointPair', () => {
    const tests = [
      { a: -Math.PI, b: Math.PI, want: PI },
      { a: Math.PI, b: -Math.PI, want: PI },
      { a: MID34.hi, b: MID34.lo, want: MID34 },
      { a: MID23.lo, b: MID23.hi, want: MID23 },
    ]
    tests.forEach((test) => {
      const got = Interval.fromPointPair(test.a, test.b)
      deepEqual(got, test.want)
    })
  })

  test('simple predicates', () => {
    ok(ZERO.isValid() && !ZERO.isEmpty() && !ZERO.isFull())
    ok(EMPTY.isValid() && EMPTY.isEmpty() && !EMPTY.isFull())
    ok(EMPTY.isInverted())
    ok(FULL.isValid() && !FULL.isEmpty() && FULL.isFull())
    ok(PI.isValid() && !PI.isEmpty() && !PI.isInverted())
    ok(MIPI.isValid() && !MIPI.isEmpty() && !MIPI.isInverted())
  })

  test('almost full or empty', () => {
    const almostPi = Math.PI - 2 * DBL_EPSILON

    let i = new Interval(-almostPi, Math.PI)
    ok(!i.isFull())

    i = new Interval(-Math.PI, almostPi)
    ok(!i.isFull())

    i = new Interval(Math.PI, -almostPi)
    ok(!i.isEmpty())

    i = new Interval(almostPi, -Math.PI)
    ok(!i.isEmpty())
  })

  test('center', () => {
    const tests = [
      { interval: QUAD12, want: Math.PI / 2 },
      { interval: Interval.fromEndpoints(3.1, 2.9), want: 3 - Math.PI },
      { interval: Interval.fromEndpoints(-2.9, -3.1), want: Math.PI - 3 },
      { interval: Interval.fromEndpoints(2.1, -2.1), want: Math.PI },
      { interval: PI, want: Math.PI },
      { interval: MIPI, want: Math.PI },
      { interval: QUAD23, want: Math.PI },
      { interval: QUAD123, want: 0.75 * Math.PI },
    ]
    tests.forEach((test) => {
      const got = test.interval.center()
      ok(Math.abs(got - test.want) <= 1e-15)
    })
  })

  test('length', () => {
    const tests = [
      { interval: QUAD12, want: Math.PI },
      { interval: PI, want: 0 },
      { interval: MIPI, want: 0 },
      { interval: QUAD123, want: 1.5 * Math.PI },
      { interval: QUAD23, want: Math.PI },
      { interval: FULL, want: 2 * Math.PI },
    ]
    tests.forEach((test) => {
      equal(test.interval.length(), test.want)
    })
    ok(EMPTY.length() < 0)
  })

  test('contains', () => {
    const tests = [
      { interval: EMPTY, in: [], out: [0, Math.PI, -Math.PI], iIn: [], iOut: [Math.PI, -Math.PI] },
      { interval: FULL, in: [0, Math.PI, -Math.PI], out: [], iIn: [Math.PI, -Math.PI], iOut: [] },
      { interval: QUAD12, in: [0, Math.PI, -Math.PI], out: [], iIn: [Math.PI / 2], iOut: [0, Math.PI, -Math.PI] },
      {
        interval: QUAD23,
        in: [Math.PI / 2, -Math.PI / 2, Math.PI, -Math.PI],
        out: [0],
        iIn: [Math.PI, -Math.PI],
        iOut: [Math.PI / 2, -Math.PI / 2, 0],
      },
      { interval: PI, in: [Math.PI, -Math.PI], out: [0], iIn: [], iOut: [Math.PI, -Math.PI] },
      { interval: MIPI, in: [Math.PI, -Math.PI], out: [0], iIn: [], iOut: [Math.PI, -Math.PI] },
      { interval: ZERO, in: [0], out: [], iIn: [], iOut: [0] },
    ]
    tests.forEach((test) => {
      test.in.forEach((p) => {
        ok(test.interval.contains(p))
      })
      test.out.forEach((p) => {
        ok(!test.interval.contains(p))
      })
      test.iIn.forEach((p) => {
        ok(test.interval.interiorContains(p))
      })
      test.iOut.forEach((p) => {
        ok(!test.interval.interiorContains(p))
      })
    })
  })

  test('operations', () => {
    const QUAD12EPS = Interval.fromEndpoints(QUAD12.lo, MID23.hi)
    const QUAD2HI = Interval.fromEndpoints(MID23.lo, QUAD12.hi)
    const QUAD412EPS = Interval.fromEndpoints(MID34.lo, QUAD12.hi)
    const QUADEPS12 = Interval.fromEndpoints(MID41.lo, QUAD12.hi)
    const QUAD1LO = Interval.fromEndpoints(QUAD12.lo, MID41.hi)
    const QUAD2LO = Interval.fromEndpoints(QUAD23.lo, MID12.hi)
    const QUAD3HI = Interval.fromEndpoints(MID34.lo, QUAD23.hi)
    const QUADEPS23 = Interval.fromEndpoints(MID12.lo, QUAD23.hi)
    const QUAD23EPS = Interval.fromEndpoints(QUAD23.lo, MID34.hi)
    const QUADEPS123 = Interval.fromEndpoints(MID41.lo, QUAD23.hi)

    const tests = [
      {
        x: EMPTY,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: EMPTY,
        wantIntersection: EMPTY,
      },
      {
        x: EMPTY,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,

        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: EMPTY,
      },
      {
        x: EMPTY,
        y: ZERO,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: ZERO,
        wantIntersection: EMPTY,
      },
      {
        x: EMPTY,
        y: PI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: PI,
        wantIntersection: EMPTY,
      },
      {
        x: EMPTY,
        y: MIPI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: MIPI,
        wantIntersection: EMPTY,
      },

      {
        x: FULL,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: EMPTY,
      },
      {
        x: FULL,
        y: FULL,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: FULL,
      },
      {
        x: FULL,
        y: ZERO,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: ZERO,
      },
      {
        x: FULL,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: PI,
      },
      {
        x: FULL,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: MIPI,
      },
      {
        x: FULL,
        y: QUAD12,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: QUAD12,
      },
      {
        x: FULL,
        y: QUAD23,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: QUAD23,
      },

      {
        x: ZERO,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: ZERO,
        wantIntersection: EMPTY,
      },
      {
        x: ZERO,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: ZERO,
      },
      {
        x: ZERO,
        y: ZERO,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: ZERO,
        wantIntersection: ZERO,
      },
      {
        x: ZERO,
        y: PI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(0, Math.PI),
        wantIntersection: EMPTY,
      },
      {
        x: ZERO,
        y: PI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD1,
        wantIntersection: EMPTY,
      },
      {
        x: ZERO,
        y: MIPI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: EMPTY,
      },
      {
        x: ZERO,
        y: MIPI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD4,
        wantIntersection: EMPTY,
      },
      {
        x: ZERO,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: ZERO,
      },
      {
        x: ZERO,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD123,
        wantIntersection: EMPTY,
      },

      {
        x: PI2,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: PI2,
        wantIntersection: EMPTY,
      },
      {
        x: PI2,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: PI2,
      },
      {
        x: PI2,
        y: ZERO,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD1,
        wantIntersection: EMPTY,
      },
      {
        x: PI2,
        y: PI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(Math.PI / 2, Math.PI),
        wantIntersection: EMPTY,
      },
      {
        x: PI2,
        y: PI2,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: PI2,
        wantIntersection: PI2,
      },
      {
        x: PI2,
        y: MIPI,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD2,
        wantIntersection: EMPTY,
      },
      {
        x: PI2,
        y: MIPI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: EMPTY,
      },
      {
        x: PI2,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: PI2,
      },
      {
        x: PI2,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: PI2,
      },

      {
        x: PI,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: PI,
        wantIntersection: EMPTY,
      },
      {
        x: PI,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: PI,
      },
      {
        x: PI,
        y: ZERO,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(Math.PI, 0),
        wantIntersection: EMPTY,
      },
      {
        x: PI,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: PI,
        wantIntersection: PI,
      },
      {
        x: PI,
        y: PI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(Math.PI / 2, Math.PI),
        wantIntersection: EMPTY,
      },
      {
        x: PI,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: PI,
        wantIntersection: PI,
      },
      {
        x: PI,
        y: MIPI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD3,
        wantIntersection: EMPTY,
      },
      {
        x: PI,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(0, Math.PI),
        wantIntersection: PI,
      },
      {
        x: PI,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: PI,
      },

      {
        x: MIPI,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: MIPI,
        wantIntersection: EMPTY,
      },
      {
        x: MIPI,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: MIPI,
      },
      {
        x: MIPI,
        y: ZERO,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,

        wantUnion: QUAD34,
        wantIntersection: EMPTY,
      },
      {
        x: MIPI,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: MIPI,
        wantIntersection: MIPI,
      },
      {
        x: MIPI,
        y: PI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD2,
        wantIntersection: EMPTY,
      },
      {
        x: MIPI,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: MIPI,
        wantIntersection: MIPI,
      },
      {
        x: MIPI,
        y: MIPI2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: Interval.fromEndpoints(-Math.PI, -Math.PI / 2),
        wantIntersection: EMPTY,
      },
      {
        x: MIPI,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: MIPI,
      },
      {
        x: MIPI,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: MIPI,
      },

      {
        x: QUAD12,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: EMPTY,
      },
      {
        x: QUAD12,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: QUAD12,
      },
      {
        x: QUAD12,
        y: ZERO,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: ZERO,
      },
      {
        x: QUAD12,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: PI,
      },
      {
        x: QUAD12,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD12,
        wantIntersection: MIPI,
      },
      {
        x: QUAD12,
        y: QUAD12,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD12,
        wantIntersection: QUAD12,
      },
      {
        x: QUAD12,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD123,
        wantIntersection: QUAD2,
      },
      {
        x: QUAD12,
        y: QUAD34,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: FULL,
        wantIntersection: QUAD12,
      },

      {
        x: QUAD23,
        y: EMPTY,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: EMPTY,
      },
      {
        x: QUAD23,
        y: FULL,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: FULL,
        wantIntersection: QUAD23,
      },
      {
        x: QUAD23,
        y: ZERO,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD234,
        wantIntersection: EMPTY,
      },
      {
        x: QUAD23,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23,
        wantIntersection: PI,
      },
      {
        x: QUAD23,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23,
        wantIntersection: MIPI,
      },
      {
        x: QUAD23,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD123,
        wantIntersection: QUAD2,
      },
      {
        x: QUAD23,
        y: QUAD23,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23,
        wantIntersection: QUAD23,
      },
      {
        x: QUAD23,
        y: QUAD34,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD234,
        wantIntersection: Interval.fromEndpoints(-Math.PI, -Math.PI / 2),
      },

      {
        x: QUAD1,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD123,
        wantIntersection: Interval.fromEndpoints(Math.PI / 2, Math.PI / 2),
      },
      {
        x: QUAD2,
        y: QUAD3,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: MIPI,
      },
      {
        x: QUAD3,
        y: QUAD2,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD23,
        wantIntersection: PI,
      },
      {
        x: QUAD2,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD2,
        wantIntersection: PI,
      },
      {
        x: QUAD2,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD2,
        wantIntersection: MIPI,
      },
      {
        x: QUAD3,
        y: PI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD3,
        wantIntersection: PI,
      },
      {
        x: QUAD3,
        y: MIPI,
        xContainsY: true,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: false,
        wantUnion: QUAD3,
        wantIntersection: MIPI,
      },

      {
        x: QUAD12,
        y: MID12,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD12,
        wantIntersection: MID12,
      },
      {
        x: MID12,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD12,
        wantIntersection: MID12,
      },

      {
        x: QUAD12,
        y: MID23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD12EPS,
        wantIntersection: QUAD2HI,
      },
      {
        x: MID23,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD12EPS,
        wantIntersection: QUAD2HI,
      },

      {
        x: QUAD12,
        y: MID34,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD412EPS,
        wantIntersection: EMPTY,
      },
      {
        x: MID34,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUAD412EPS,
        wantIntersection: EMPTY,
      },

      {
        x: QUAD12,
        y: MID41,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUADEPS12,
        wantIntersection: QUAD1LO,
      },
      {
        x: MID41,
        y: QUAD12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUADEPS12,
        wantIntersection: QUAD1LO,
      },

      {
        x: QUAD23,
        y: MID12,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUADEPS23,
        wantIntersection: QUAD2LO,
      },
      {
        x: MID12,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUADEPS23,
        wantIntersection: QUAD2LO,
      },
      {
        x: QUAD23,
        y: MID23,
        xContainsY: true,
        xInteriorContainsY: true,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23,
        wantIntersection: MID23,
      },
      {
        x: MID23,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23,
        wantIntersection: MID23,
      },
      {
        x: QUAD23,
        y: MID34,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23EPS,
        wantIntersection: QUAD3HI,
      },
      {
        x: MID34,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: true,
        xInteriorIntersectsY: true,
        wantUnion: QUAD23EPS,
        wantIntersection: QUAD3HI,
      },
      {
        x: QUAD23,
        y: MID41,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUADEPS123,
        wantIntersection: EMPTY,
      },
      {
        x: MID41,
        y: QUAD23,
        xContainsY: false,
        xInteriorContainsY: false,
        xIntersectsY: false,
        xInteriorIntersectsY: false,
        wantUnion: QUADEPS123,
        wantIntersection: EMPTY,
      },
    ]
    tests.forEach((test) => {
      ok(test.x.containsInterval(test.y) === test.xContainsY)
      ok(test.x.interiorContainsInterval(test.y) === test.xInteriorContainsY)
      ok(test.x.intersects(test.y) === test.xIntersectsY)
      ok(test.x.interiorIntersects(test.y) === test.xInteriorIntersectsY)
      deepEqual(test.x.union(test.y), test.wantUnion)
      deepEqual(test.x.intersection(test.y), test.wantIntersection)
    })
  })

  test('addPoint', () => {
    const tests = [
      { interval: EMPTY, points: [0], want: ZERO },
      { interval: EMPTY, points: [Math.PI], want: PI },
      { interval: EMPTY, points: [-Math.PI], want: MIPI },
      { interval: EMPTY, points: [Math.PI, -Math.PI], want: PI },
      { interval: EMPTY, points: [-Math.PI, Math.PI], want: MIPI },
      { interval: EMPTY, points: [MID12.lo, MID12.hi], want: MID12 },
      { interval: EMPTY, points: [MID23.lo, MID23.hi], want: MID23 },
      { interval: QUAD1, points: [-0.9 * Math.PI, -Math.PI / 2], want: QUAD123 },
      { interval: FULL, points: [0], want: FULL },
      { interval: FULL, points: [Math.PI], want: FULL },
      { interval: FULL, points: [-Math.PI], want: FULL },
    ]
    tests.forEach((test) => {
      let got = test.interval
      test.points.forEach((point) => {
        got = got.addPoint(point)
      })
      const want = test.want
      ok(Math.abs(got.lo - want.lo) <= 1e-15 && Math.abs(got.hi - want.hi) <= 1e-15)
    })
  })

  test('expanded', () => {
    const tests = [
      { interval: EMPTY, margin: 1, want: EMPTY },
      { interval: FULL, margin: 1, want: FULL },
      { interval: ZERO, margin: 1, want: Interval.fromEndpoints(-1, 1) },
      { interval: MIPI, margin: 0.01, want: Interval.fromEndpoints(Math.PI - 0.01, -Math.PI + 0.01) },
      { interval: PI, margin: 27, want: FULL },
      { interval: PI, margin: Math.PI / 2, want: QUAD23 },
      { interval: PI2, margin: Math.PI / 2, want: QUAD12 },
      { interval: MIPI2, margin: Math.PI / 2, want: QUAD34 },

      { interval: EMPTY, margin: -1, want: EMPTY },
      { interval: FULL, margin: -1, want: FULL },
      { interval: QUAD123, margin: -27, want: EMPTY },
      { interval: QUAD234, margin: -27, want: EMPTY },
      { interval: QUAD123, margin: -Math.PI / 2, want: QUAD2 },
      { interval: QUAD341, margin: -Math.PI / 2, want: QUAD4 },
      { interval: QUAD412, margin: -Math.PI / 2, want: QUAD1 },
    ]
    tests.forEach((test) => {
      const got = test.interval.expanded(test.margin)
      const want = test.want
      ok(Math.abs(got.lo - want.lo) <= 1e-15 && Math.abs(got.hi - want.hi) <= 1e-15)
    })
  })

  test('toString', () => {
    equal(PI.toString(), '[3.1415927, 3.1415927]')
  })

  test('approxEqual', () => {
    const lo = 4 * DBL_EPSILON // < epsilon default
    const hi = 6 * DBL_EPSILON // > epsilon default

    const tests = [
      { a: EMPTY, b: EMPTY, want: true },
      { a: ZERO, b: EMPTY, want: true },
      { a: EMPTY, b: ZERO, want: true },
      { a: PI, b: EMPTY, want: true },
      { a: EMPTY, b: PI, want: true },
      { a: MIPI, b: EMPTY, want: true },
      { a: EMPTY, b: MIPI, want: true },
      { a: EMPTY, b: FULL, want: false },
      { a: EMPTY, b: Interval.fromEndpoints(1, 1 + 2 * lo), want: true },
      { a: EMPTY, b: Interval.fromEndpoints(1, 1 + 2 * hi), want: false },
      { a: Interval.fromEndpoints(Math.PI - lo, -Math.PI + lo), b: EMPTY, want: true },

      { a: FULL, b: FULL, want: true },
      { a: FULL, b: EMPTY, want: false },
      { a: FULL, b: ZERO, want: false },
      { a: FULL, b: PI, want: false },
      { a: FULL, b: Interval.fromEndpoints(lo, -lo), want: true },
      { a: FULL, b: Interval.fromEndpoints(2 * hi, 0), want: false },
      { a: Interval.fromEndpoints(-Math.PI + lo, Math.PI - lo), b: FULL, want: true },
      { a: Interval.fromEndpoints(-Math.PI, Math.PI - 2 * hi), b: FULL, want: false },

      { a: PI, b: PI, want: true },
      { a: MIPI, b: PI, want: true },
      { a: PI, b: Interval.fromEndpoints(Math.PI - lo, Math.PI - lo), want: true },
      { a: PI, b: Interval.fromEndpoints(Math.PI - hi, Math.PI - hi), want: false },
      { a: PI, b: Interval.fromEndpoints(Math.PI - lo, -Math.PI + lo), want: true },
      { a: PI, b: Interval.fromEndpoints(Math.PI - hi, -Math.PI), want: false },
      { a: ZERO, b: PI, want: false },
      { a: PI.union(MID12).union(ZERO), b: QUAD12, want: true },
      { a: QUAD2.intersection(QUAD3), b: PI, want: true },
      { a: QUAD3.intersection(QUAD2), b: PI, want: true },

      { a: Interval.fromEndpoints(0, lo), b: Interval.fromEndpoints(lo, 0), want: false },
      {
        a: Interval.fromEndpoints(Math.PI - 0.5 * lo, -Math.PI + 0.5 * lo),
        b: Interval.fromEndpoints(-Math.PI + 0.5 * lo, Math.PI - 0.5 * lo),
        want: false,
      },

      { a: Interval.fromEndpoints(1 - lo, 2 + lo), b: Interval.fromEndpoints(1, 2), want: true },
      { a: Interval.fromEndpoints(1 + lo, 2 - lo), b: Interval.fromEndpoints(1, 2), want: true },
      {
        a: Interval.fromEndpoints(
          2 - lo,

          1 + lo,
        ),
        b: Interval.fromEndpoints(2, 1),
        want: true,
      },
      { a: Interval.fromEndpoints(2 + lo, 1 - lo), b: Interval.fromEndpoints(2, 1), want: true },
      { a: Interval.fromEndpoints(1 - hi, 2 + lo), b: Interval.fromEndpoints(1, 2), want: false },
      { a: Interval.fromEndpoints(1 + hi, 2 - lo), b: Interval.fromEndpoints(1, 2), want: false },
      { a: Interval.fromEndpoints(2 - hi, 1 + lo), b: Interval.fromEndpoints(2, 1), want: false },
      { a: Interval.fromEndpoints(2 + hi, 1 - lo), b: Interval.fromEndpoints(2, 1), want: false },
      { a: Interval.fromEndpoints(1 - lo, 2 + hi), b: Interval.fromEndpoints(1, 2), want: false },
      { a: Interval.fromEndpoints(1 + lo, 2 - hi), b: Interval.fromEndpoints(1, 2), want: false },
      { a: Interval.fromEndpoints(2 - lo, 1 + hi), b: Interval.fromEndpoints(2, 1), want: false },
      { a: Interval.fromEndpoints(2 + lo, 1 - hi), b: Interval.fromEndpoints(2, 1), want: false },
    ]

    tests.forEach((test) => {
      equal(test.a.approxEqual(test.b), test.want)
    })
  })

  test('complement', () => {
    ok(Interval.emptyInterval().complement().isFull())
    ok(Interval.fullInterval().complement().isEmpty())
    ok(PI.complement().isFull())
    ok(MIPI.complement().isFull())
    ok(ZERO.complement().isFull())

    ok(QUAD12.complement().approxEqual(QUAD34))
    ok(QUAD34.complement().approxEqual(QUAD12))
    ok(QUAD123.complement().approxEqual(QUAD4))
  })

  test('directedHausdorffDistance', () => {
    const inInterval = Interval.fromEndpoints(3.0, -3.0)
    const tests = [
      {
        i: Interval.fromEndpoints(-0.139626, 0.349066),
        y: Interval.fromEndpoints(0.139626, 0.139626),
        want: 0.279252 * RADIAN,
      },
      { i: Interval.fromEndpoints(0.2, 0.4), y: Interval.fromEndpoints(0.1, 0.5), want: 0 * RADIAN },
      { i: Interval.fromEndpoints(0, 0), y: Interval.emptyInterval(), want: Math.PI * RADIAN },
      { i: Interval.emptyInterval(), y: Interval.emptyInterval(), want: 0.0 },
      { i: Interval.emptyInterval(), y: MID12, want: 0.0 },
      { i: MID12, y: Interval.emptyInterval(), want: Math.PI },
      { i: QUAD12, y: QUAD123, want: 0.0 },
      { i: Interval.fromEndpoints(-0.1, 0.2), y: inInterval, want: 3.0 },
      { i: Interval.fromEndpoints(0.1, 0.2), y: inInterval, want: 3.0 - 0.1 },
      { i: Interval.fromEndpoints(-0.2, -0.1), y: inInterval, want: 3.0 - 0.1 },
    ]

    tests.forEach((test) => {
      equal(angle.radians(test.i.directedHausdorffDistance(test.y)), test.want)
    })
  })

  test('project', () => {
    const r = Interval.fromEndpoints(-Math.PI, -Math.PI)
    const r1 = Interval.fromEndpoints(0, Math.PI)
    const r2 = Interval.fromEndpoints(Math.PI - 0.1, -Math.PI + 0.1)
    const tests = [
      { interval: r, have: -Math.PI, want: Math.PI },
      { interval: r, have: 0, want: Math.PI },

      { interval: r1, have: 0.1, want: 0.1 },
      { interval: r1, have: -Math.PI / 2 + 1e-15, want: 0 },
      { interval: r1, have: -Math.PI / 2 - 1e-15, want: Math.PI },
      { interval: r2, have: Math.PI, want: Math.PI },
      { interval: r2, have: 1e-15, want: Math.PI - 0.1 },
      { interval: r2, have: -1e-15, want: -Math.PI + 0.1 },
      { interval: FULL, have: 0, want: 0 },
      { interval: FULL, have: Math.PI, want: Math.PI },
      { interval: FULL, have: -Math.PI, want: Math.PI },
    ]

    tests.forEach((test) => {
      equal(test.interval.project(test.have), test.want)
    })
  })
})
