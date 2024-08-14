import { test, describe } from 'node:test'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { Vector } from './Vector'

describe('r3.Vector', () => {
  test('norm', (t) => {
    deepEqual(new Vector(0, 0, 0).norm(), 0)
    deepEqual(new Vector(0, 1, 0).norm(), 1)
    deepEqual(new Vector(3, -4, 12).norm(), 13)
    deepEqual(new Vector(1, 1e-16, 1e-32).norm(), 1)

    // This will overflow the float64, and should return zero.
    deepEqual(
      new Vector(
        -0,
        4.3145006366056343748277397783556100978621924913975e-196,
        4.3145006366056343748277397783556100978621924913975e-196
      ).norm(),
      0
    )
  })

  test('norm2', (t) => {
    deepEqual(new Vector(0, 0, 0).norm2(), 0)
    deepEqual(new Vector(0, 1, 0).norm2(), 1)
    deepEqual(new Vector(1, 1, 1).norm2(), 3)
    deepEqual(new Vector(1, 2, 3).norm2(), 14)
    deepEqual(new Vector(3, -4, 12).norm2(), 169)
    deepEqual(new Vector(3, -4, 12).norm2(), 169)
    deepEqual(new Vector(1, 1e-16, 1e-32).norm2(), 1)

    // This will overflow the float64, and should return zero.
    deepEqual(
      new Vector(
        -0,
        4.3145006366056343748277397783556100978621924913975e-196,
        4.3145006366056343748277397783556100978621924913975e-196
      ).norm2(),
      0
    )
  })

  test('normalize', (t) => {
    let v = new Vector(1, 0, 0)
    let nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    v = new Vector(0, 1, 0)
    nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    v = new Vector(0, 0, 1)
    nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    v = new Vector(1, 1, 1)
    nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    v = new Vector(1, 1e-16, 1e-32)
    nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    v = new Vector(12.34, 56.78, 91.01)
    nv = v.normalize()
    equal(v.x * nv.y, v.y * nv.x, 'normalize() did not preserve direction')
    equal(nv.norm(), 1.0)

    // Test a vector that overflows a float64 during normalize.
    v = new Vector(
      -0,
      4.3145006366056343748277397783556100978621924913975e-196,
      4.3145006366056343748277397783556100978621924913975e-196
    )
    deepEqual(v.normalize(), new Vector(0, 0, 0))
  })

  test('isUnit', (t) => {
    ok(!new Vector(0, 0, 0).isUnit())
    ok(new Vector(0, 1, 0).isUnit())
    ok(new Vector(1 + 2 * 1e-14, 0, 0).isUnit())
    ok(new Vector(1 * (1 + 1e-14), 0, 0).isUnit())
    ok(!new Vector(1, 1, 1).isUnit())
    ok(new Vector(1, 1e-16, 1e-32).isUnit())
  })

  test('dot', (t) => {
    equal(new Vector(1, 0, 0).dot(new Vector(1, 0, 0)), 1)
    equal(new Vector(1, 0, 0).dot(new Vector(0, 1, 0)), 0)
    equal(new Vector(0, 1, 0).dot(new Vector(1, 0, 0)), 0)
    equal(new Vector(1, 0, 0).dot(new Vector(0, 1, 1)), 0)
    equal(new Vector(0, 1, 1).dot(new Vector(1, 0, 0)), 0)
    equal(new Vector(1, 1, 1).dot(new Vector(-1, -1, -1)), -3)
    equal(new Vector(-1, -1, -1).dot(new Vector(1, 1, 1)), -3)
    equal(new Vector(1, 2, 2).dot(new Vector(-0.3, 0.4, -1.2)), -1.9)
    equal(new Vector(-0.3, 0.4, -1.2).dot(new Vector(1, 2, 2)), -1.9)
  })

  test('cross', (t) => {
    deepEqual(new Vector(1, 0, 0).cross(new Vector(1, 0, 0)), new Vector(0, 0, 0))
    deepEqual(new Vector(1, 0, 0).cross(new Vector(0, 1, 0)), new Vector(0, 0, 1))
    deepEqual(new Vector(0, 1, 0).cross(new Vector(1, 0, 0)), new Vector(0, 0, -1))
    deepEqual(new Vector(1, 2, 3).cross(new Vector(-4, 5, -6)), new Vector(-27, -6, 13))
  })

  test('add', (t) => {
    deepEqual(new Vector(0, 0, 0).add(new Vector(0, 0, 0)), new Vector(0, 0, 0))
    deepEqual(new Vector(1, 0, 0).add(new Vector(0, 0, 0)), new Vector(1, 0, 0))
    deepEqual(new Vector(1, 2, 3).add(new Vector(4, 5, 7)), new Vector(5, 7, 10))
    deepEqual(new Vector(1, -3, 5).add(new Vector(1, -6, -6)), new Vector(2, -9, -1))
  })

  test('sub', (t) => {
    deepEqual(new Vector(0, 0, 0).sub(new Vector(0, 0, 0)), new Vector(0, 0, 0))
    deepEqual(new Vector(1, 0, 0).sub(new Vector(0, 0, 0)), new Vector(1, 0, 0))
    deepEqual(new Vector(1, 2, 3).sub(new Vector(4, 5, 7)), new Vector(-3, -3, -4))
    deepEqual(new Vector(1, -3, 5).sub(new Vector(1, -6, -6)), new Vector(0, 3, 11))
  })

  test('distance', (t) => {
    equal(new Vector(1, 0, 0).distance(new Vector(1, 0, 0)), 0)
    equal(new Vector(1, 0, 0).distance(new Vector(0, 1, 0)), 1.4142135623730951)
    equal(new Vector(0, 1, 0).distance(new Vector(1, 0, 0)), 1.4142135623730951)
    equal(new Vector(0, 1, 1).distance(new Vector(1, 0, 0)), 1.7320508075688772)
    equal(new Vector(1, 0, 0).distance(new Vector(0, 1, 1)), 1.7320508075688772)
    equal(new Vector(0, 1, 1).distance(new Vector(1, 0, 0)), 1.7320508075688772)
    equal(new Vector(1, 1, 1).distance(new Vector(-1, -1, -1)), 3.4641016151377544)
    equal(new Vector(-1, -1, -1).distance(new Vector(1, 1, 1)), 3.4641016151377544)
    equal(new Vector(1, 2, 2).distance(new Vector(-0.3, 0.4, -1.2)), 3.8065732621348563)
    equal(new Vector(-0.3, 0.4, -1.2).distance(new Vector(1, 2, 2)), 3.8065732621348563)
  })

  test('mul', (t) => {
    deepEqual(new Vector(0, 0, 0).mul(3), new Vector(0, 0, 0))
    deepEqual(new Vector(1, 0, 0).mul(1), new Vector(1, 0, 0))
    deepEqual(new Vector(1, 0, 0).mul(0), new Vector(0, 0, 0))
    deepEqual(new Vector(1, 0, 0).mul(3), new Vector(3, 0, 0))
    deepEqual(new Vector(1, -3, 5).mul(-1), new Vector(-1, 3, -5))
    deepEqual(new Vector(1, -3, 5).mul(2), new Vector(2, -6, 10))
  })

  test('angle', (t) => {
    equal(new Vector(1, 0, 0).angle(new Vector(1, 0, 0)), 0)
    equal(new Vector(1, 0, 0).angle(new Vector(0, 1, 0)), Math.PI / 2)
    equal(new Vector(0, 1, 0).angle(new Vector(1, 0, 0)), Math.PI / 2)
    equal(new Vector(1, 0, 0).angle(new Vector(0, 1, 1)), Math.PI / 2)
    equal(new Vector(0, 1, 1).angle(new Vector(1, 0, 0)), Math.PI / 2)
    equal(new Vector(1, 0, 0).angle(new Vector(-1, 0, 0)), Math.PI)
    equal(new Vector(-1, 0, 0).angle(new Vector(1, 0, 0)), Math.PI)
    equal(new Vector(1, 2, 3).angle(new Vector(2, 3, -1)), 1.2055891055045298)
    equal(new Vector(2, 3, -1).angle(new Vector(1, 2, 3)), 1.2055891055045298)
  })

  test('ortho', (t) => {
    let v = new Vector(1, 0, 0)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 1)

    v = new Vector(1, 1, 0)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 1)

    v = new Vector(1, 2, 3)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 0.9999999999999999) // ~1

    v = new Vector(1, -2, -5)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 1)

    v = new Vector(0.012, 0.0053, 0.00457)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 1)

    v = new Vector(-0.012, -1, -0.00457)
    equal(v.dot(v.ortho()), 0)
    equal(v.ortho().norm(), 0.9999999999999998) // ~1
  })

  test('ortho alignment', (t) => {
    deepEqual(new Vector(1, 0, 0).ortho(), new Vector(0, -1, 0))
    deepEqual(new Vector(0, 1, 0).ortho(), new Vector(0, 0, -1))
    deepEqual(new Vector(0, 0, 1).ortho(), new Vector(-1, 0, 0))
  })

  test('ortho alignment', (t) => {
    const cases = [
      [new Vector(0, 0, 0), new Vector(0, 0, 0)],
      [new Vector(0, 0, 0), new Vector(0, 1, 2)],
      [new Vector(1, 0, 0), new Vector(0, 1, 0)],
      [new Vector(1, 0, 0), new Vector(0, 1, 1)],
      [new Vector(1, 1, 1), new Vector(-1, -1, -1)],
      [new Vector(1, 2, 2), new Vector(-0.3, 0.4, -1.2)]
    ]

    cases.forEach(([v1, v2]) => {
      const a1 = v1.angle(v2)
      const a2 = v2.angle(v1)
      const c1 = v1.cross(v2)
      const c2 = v2.cross(v1)
      const d1 = v1.dot(v2)
      const d2 = v2.dot(v1)

      equal(a1, a2) // Angle commutes
      equal(d1, d2) // Dot commutes
      ok(c1.approxEqual(c2.mul(-1.0))) // Cross anti-commutes
      equal(v1.dot(c1), 0.0) // Cross is orthogonal to original vectors
      equal(v2.dot(c1), 0.0)
    })

    deepEqual(new Vector(1, 0, 0).ortho(), new Vector(0, -1, 0))
    deepEqual(new Vector(0, 1, 0).ortho(), new Vector(0, 0, -1))
    deepEqual(new Vector(0, 0, 1).ortho(), new Vector(-1, 0, 0))
  })

  test('largest/smallest components', (t) => {
    equal(new Vector(0, 0, 0).largestComponent(), Vector.Z_AXIS)
    equal(new Vector(0, 0, 0).smallestComponent(), Vector.Z_AXIS)
    equal(new Vector(1, 0, 0).largestComponent(), Vector.X_AXIS)
    equal(new Vector(1, 0, 0).smallestComponent(), Vector.Z_AXIS)
    equal(new Vector(1, -1, 0).largestComponent(), Vector.Y_AXIS)
    equal(new Vector(1, -1, 0).smallestComponent(), Vector.Z_AXIS)
    equal(new Vector(-1, -1.1, -1.1).largestComponent(), Vector.Z_AXIS)
    equal(new Vector(-1, -1.1, -1.1).smallestComponent(), Vector.X_AXIS)
    equal(new Vector(0.5, -0.4, -0.5).largestComponent(), Vector.Z_AXIS)
    equal(new Vector(0.5, -0.4, -0.5).smallestComponent(), Vector.Y_AXIS)
    equal(new Vector(1e-15, 1e-14, 1e-13).largestComponent(), Vector.Z_AXIS)
    equal(new Vector(1e-15, 1e-14, 1e-13).smallestComponent(), Vector.X_AXIS)
  })

  test('cmp', (t) => {
    equal(new Vector(0, 0, 0).cmp(new Vector(0, 0, 0)), 0)
    equal(new Vector(0, 0, 0).cmp(new Vector(1, 0, 0)), -1)
    equal(new Vector(0, 1, 0).cmp(new Vector(0, 0, 0)), 1)
    equal(new Vector(1, 2, 3).cmp(new Vector(3, 2, 1)), -1)
    equal(new Vector(-1, 0, 0).cmp(new Vector(0, 0, -1)), -1)
    equal(new Vector(8, 6, 4).cmp(new Vector(7, 5, 3)), 1)
    equal(new Vector(-1, -0.5, 0).cmp(new Vector(0, 0, 0.1)), -1)
    equal(new Vector(1, 2, 3).cmp(new Vector(2, 3, 4)), -1)
    equal(new Vector(1.23, 4.56, 7.89).cmp(new Vector(1.23, 4.56, 7.89)), 0)
  })
})
