import test from 'node:test'
import { equal, deepEqual } from 'node:assert/strict'
import { Point } from './Point'

export const MAX_FLOAT32 = Math.pow(2, 127) * (2 - 1 / Math.pow(2, 23))

test('add', t => {
  deepEqual(new Point(0, 0).add(new Point(0, 0)), new Point(0, 0))
  deepEqual(new Point(0, 1).add(new Point(0, 0)), new Point(0, 1))
  deepEqual(new Point(1, 1).add(new Point(4, 3)), new Point(5, 4))
  deepEqual(new Point(-4, 7).add(new Point(1, 5)), new Point(-3, 12))
})

test('sub', t => {
  deepEqual(new Point(0, 0).sub(new Point(0, 0)), new Point(0, 0))
  deepEqual(new Point(0, 1).sub(new Point(0, 0)), new Point(0, 1))
  deepEqual(new Point(1, 1).sub(new Point(4, 3)), new Point(-3, -2))
  deepEqual(new Point(-4, 7).sub(new Point(1, 5)), new Point(-5, 2))
})

test('mul', t => {
  deepEqual(new Point(0, 0).mul(0), new Point(0, 0))
  deepEqual(new Point(0, 1).mul(1), new Point(0, 1))
  deepEqual(new Point(1, 1).mul(5), new Point(5, 5))
})

test('ortho', t => {
  deepEqual(new Point(0, 0).ortho(), new Point(-0, 0))
  deepEqual(new Point(0, 1).ortho(), new Point(-1, 0))
  deepEqual(new Point(1, 1).ortho(), new Point(-1, 1))
  deepEqual(new Point(-4, 7).ortho(), new Point(-7, -4))
  deepEqual(new Point(1, Math.sqrt(3)).ortho(), new Point(-Math.sqrt(3), 1))
})

test('dot', t => {
  equal(new Point(0, 0).dot(new Point(0, 0)), 0)
  equal(new Point(0, 1).dot(new Point(0, 0)), 0)
  equal(new Point(1, 1).dot(new Point(4, 3)), 7)
  equal(new Point(-4, 7).dot(new Point(1, 5)), 31)
})

test('cross', t => {
  equal(new Point(0, 0).cross(new Point(0, 0)), 0)
  equal(new Point(0, 1).cross(new Point(0, 0)), 0)
  equal(new Point(1, 1).cross(new Point(-1, -1)), 0)
  equal(new Point(1, 1).cross(new Point(4, 3)), -1)
  equal(new Point(1, 5).cross(new Point(-2, 3)), 13)
})

test('norm', t => {
  equal(new Point(0, 0).norm(), 0)
  equal(new Point(0, 1).norm(), 1)
  equal(new Point(-1, 0).norm(), 1)
  equal(new Point(3, 4).norm(), 5)
  equal(new Point(3, -4).norm(), 5)
  equal(new Point(2, 2).norm(), 2 * Math.sqrt(2))
  equal(new Point(1, Math.sqrt(3)).norm(), 2)
  equal(new Point(29, 29 * Math.sqrt(3)).norm(), 29 * 2 + 0.00000000000001)
  equal(new Point(1, 1e15).norm(), 1e15)
  equal(new Point(1e14, MAX_FLOAT32 - 1).norm(), MAX_FLOAT32)
})

test('normalize', t => {
  deepEqual(new Point().normalize(), new Point(0, 0))
  deepEqual(new Point(0, 0).normalize(), new Point(0, 0))
  deepEqual(new Point(0, 1).normalize(), new Point(0, 1))
  deepEqual(new Point(-1, 0).normalize(), new Point(-1, 0))
  deepEqual(new Point(3, 4).normalize().trunc(), new Point(0.6, 0.8))
  deepEqual(new Point(3, -4).normalize().trunc(), new Point(0.6, -0.8))
  deepEqual(new Point(2, 2).normalize().trunc(), new Point(Math.sqrt(2) / 2, Math.sqrt(2) / 2).trunc())
  deepEqual(new Point(7, 7 * Math.sqrt(3)).normalize().trunc(), new Point(0.5, Math.sqrt(3) / 2).trunc())
  deepEqual(new Point(1e21, 1e21 * Math.sqrt(3)).normalize().trunc(), new Point(0.5, Math.sqrt(3) / 2).trunc())
  deepEqual(new Point(1, 1e16).normalize().trunc(), new Point(0, 1))
  deepEqual(new Point(1e4, MAX_FLOAT32 - 1).normalize().trunc(), new Point(0, 1))
})

test('trunc', t => {
  deepEqual(new Point().trunc(), new Point(0, 0))
  deepEqual(new Point(0.0000000000000001, 0.0000000000000001).trunc(), new Point(0, 0))
  deepEqual(new Point(0.00000000001, 0.00000000001).trunc(10), new Point(0, 0))
})

test('toString', t => {
  equal(new Point().toString(), '(0.000000000000, 0.000000000000)')
  equal(new Point(0.0000000000000001, 0.0000000000000001).toString(), '(0.000000000000, 0.000000000000)')
  equal(new Point(-1, 1).toString(), '(-1.000000000000, 1.000000000000)')
  equal(new Point(-1.123456789123456789, 1).toString(), '(-1.123456789123, 1.000000000000)')
})
