import { BigFloat32 as BigFloat } from 'bigfloat'
import { test, describe } from 'node:test'
import { strictEqual, ok } from 'node:assert/strict'
import { Vector } from './Vector'
import { PreciseVector } from './PreciseVector'

// Helper functions
function preciseEq(a: BigFloat, b: BigFloat): boolean {
  return a.cmp(b) === 0
}

describe('r3.PreciseVector', () => {
  test('roundtrip', () => {
    const tests = [new Vector(0, 0, 0), new Vector(1, 2, 3), new Vector(3, -4, 12), new Vector(1, 1e-16, 1e-32)]

    for (const test of tests) {
      const got = PreciseVector.fromVector(test).vector()
      const want = test.normalize()
      ok(got.approxEqual(want))
    }
  })

  test('isUnit', () => {
    const epsilon = 1e-14
    const tests = [
      { v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)), want: false },
      { v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)), want: true },
      { v: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)), want: true },
      { v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)), want: true },
      { v: new PreciseVector(new BigFloat(1 + 2 * epsilon), new BigFloat(0), new BigFloat(0)), want: false },
      { v: new PreciseVector(new BigFloat(0 * (1 + epsilon)), new BigFloat(0), new BigFloat(0)), want: false },
      { v: new PreciseVector(new BigFloat(1), new BigFloat(1), new BigFloat(1)), want: false }
    ]

    for (const test of tests) {
      strictEqual(test.v.isUnit(), test.want)
    }
  })

  test('norm2', () => {
    const tests = [
      { v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)), want: new BigFloat(0) },
      { v: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)), want: new BigFloat(1) },
      { v: new PreciseVector(new BigFloat(1), new BigFloat(1), new BigFloat(1)), want: new BigFloat(3) },
      { v: new PreciseVector(new BigFloat(1), new BigFloat(2), new BigFloat(3)), want: new BigFloat(14) },
      { v: new PreciseVector(new BigFloat(3), new BigFloat(-4), new BigFloat(12)), want: new BigFloat(169) }
    ]

    for (const test of tests) {
      ok(preciseEq(test.v.norm2(), test.want))
    }
  })

  test('add', () => {
    const tests = [
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(2), new BigFloat(3)),
        v2: new PreciseVector(new BigFloat(4), new BigFloat(5), new BigFloat(7)),
        want: new PreciseVector(new BigFloat(5), new BigFloat(7), new BigFloat(10))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(-6), new BigFloat(-6)),
        want: new PreciseVector(new BigFloat(2), new BigFloat(-9), new BigFloat(-1))
      }
    ]

    for (const test of tests) {
      ok(test.v1.add(test.v2).equals(test.want))
    }
  })

  test('sub', () => {
    const tests = [
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(2), new BigFloat(3)),
        v2: new PreciseVector(new BigFloat(4), new BigFloat(5), new BigFloat(7)),
        want: new PreciseVector(new BigFloat(-3), new BigFloat(-3), new BigFloat(-4))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(-6), new BigFloat(-6)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(3), new BigFloat(11))
      }
    ]

    for (const test of tests) {
      ok(test.v1.sub(test.v2).equals(test.want))
    }
  })

  test('mul', () => {
    const tests = [
      {
        v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        f: new BigFloat(3),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: new BigFloat(1),
        want: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: new BigFloat(0),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: new BigFloat(3),
        want: new PreciseVector(new BigFloat(3), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        f: new BigFloat(-1),
        want: new PreciseVector(new BigFloat(-1), new BigFloat(3), new BigFloat(-5))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        f: new BigFloat(2),
        want: new PreciseVector(new BigFloat(2), new BigFloat(-6), new BigFloat(10))
      }
    ]

    for (const test of tests) {
      ok(test.v.mul(test.f).equals(test.want))
    }
  })

  test('mul by float64', () => {
    const tests = [
      {
        v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        f: 3,
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: 1,
        want: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: 0,
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        f: 3,
        want: new PreciseVector(new BigFloat(3), new BigFloat(0), new BigFloat(0))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        f: -1,
        want: new PreciseVector(new BigFloat(-1), new BigFloat(3), new BigFloat(-5))
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(-3), new BigFloat(5)),
        f: 2,
        want: new PreciseVector(new BigFloat(2), new BigFloat(-6), new BigFloat(10))
      }
    ]

    for (const test of tests) {
      ok(test.v.mulByFloat64(test.f).equals(test.want))
    }
  })

  test('dot', () => {
    const tests = [
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        want: new BigFloat(1)
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        want: new BigFloat(1)
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)),
        want: new BigFloat(1)
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        want: new BigFloat(0)
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(1)),
        want: new BigFloat(0)
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(1), new BigFloat(1)),
        v2: new PreciseVector(new BigFloat(-1), new BigFloat(-1), new BigFloat(-1)),
        want: new BigFloat(-3)
      }
    ]

    for (const test of tests) {
      ok(preciseEq(test.v1.dot(test.v2), test.want))
      ok(preciseEq(test.v2.dot(test.v1), test.want))
    }
  })

  test('cross', () => {
    const tests = [
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1))
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)),
        want: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        want: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(-1))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(2), new BigFloat(3)),
        v2: new PreciseVector(new BigFloat(-4), new BigFloat(5), new BigFloat(-6)),
        want: new PreciseVector(new BigFloat(-27), new BigFloat(-6), new BigFloat(13))
      }
    ]

    for (const test of tests) {
      ok(test.v1.cross(test.v2).equals(test.want))
    }
  })

  test('identities', () => {
    const tests = [
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(2))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(0))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        v2: new PreciseVector(new BigFloat(0), new BigFloat(1), new BigFloat(1))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(1), new BigFloat(1)),
        v2: new PreciseVector(new BigFloat(-1), new BigFloat(-1), new BigFloat(-1))
      },
      {
        v1: new PreciseVector(new BigFloat(1), new BigFloat(2), new BigFloat(2)),
        v2: new PreciseVector(new BigFloat(-0.3), new BigFloat(0.4), new BigFloat(-1.2))
      }
    ]

    for (const test of tests) {
      const c1 = test.v1.cross(test.v2)
      const c2 = test.v2.cross(test.v1)
      const d1 = test.v1.dot(test.v2)
      const d2 = test.v2.dot(test.v1)

      ok(preciseEq(d1, d2))
      ok(c1.equals(c2.mulByFloat64(-1)))
      ok(preciseEq(test.v1.dot(c1), new BigFloat(0)))
      ok(preciseEq(test.v2.dot(c1), new BigFloat(0)))
    }
  })

  test('largest / smallest components', () => {
    const tests = [
      {
        v: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)),
        largest: Vector.Z_AXIS,
        smallest: Vector.Z_AXIS
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0)),
        largest: Vector.X_AXIS,
        smallest: Vector.Z_AXIS
      },
      {
        v: new PreciseVector(new BigFloat(1), new BigFloat(-1), new BigFloat(0)),
        largest: Vector.Y_AXIS,
        smallest: Vector.Z_AXIS
      },
      {
        v: new PreciseVector(new BigFloat(-1), new BigFloat(-1.1), new BigFloat(-1.1)),
        largest: Vector.Z_AXIS,
        smallest: Vector.X_AXIS
      },
      {
        v: new PreciseVector(new BigFloat(0.5), new BigFloat(-0.4), new BigFloat(-0.5)),
        largest: Vector.Z_AXIS,
        smallest: Vector.Y_AXIS
      },
      {
        v: new PreciseVector(new BigFloat(1e-15), new BigFloat(1e-14), new BigFloat(1e-13)),
        largest: Vector.Z_AXIS,
        smallest: Vector.X_AXIS
      }
    ]

    for (const test of tests) {
      strictEqual(test.v.largestComponent(), test.largest)
      strictEqual(test.v.smallestComponent(), test.smallest)
    }
  })

  test('isZero', () => {
    const x = new PreciseVector(new BigFloat(1e20), new BigFloat(0), new BigFloat(0))
    const y = new PreciseVector(new BigFloat(1), new BigFloat(0), new BigFloat(0))
    const xy = x.add(y)

    const tests = [
      { have: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(0)), want: true },
      { have: new PreciseVector(new BigFloat(0), new BigFloat(-0), new BigFloat(0)), want: true },
      { have: new PreciseVector(new BigFloat(0), new BigFloat(0), new BigFloat(1)), want: false },
      { have: x.add(y).add(x.mul(new BigFloat(-1))), want: false },
      { have: xy.sub(xy), want: true }
    ]

    for (const test of tests) {
      strictEqual(test.have.isZero(), test.want)
    }
  })
})
