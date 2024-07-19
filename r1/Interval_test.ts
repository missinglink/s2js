import test from 'node:test'
import { ok, equal } from 'node:assert/strict'
import { Interval } from './Interval'

// Some standard intervals for use throughout the tests.
const UNIT = new Interval(0, 1)
const NEG_UNIT = new Interval(-1, 0)
const HALF = new Interval(0.5, 0.5)
const EMPTY = Interval.empty()

test('isEmpty', t => {
  ok(!UNIT.isEmpty(), 'should not be empty')
  ok(!NEG_UNIT.isEmpty(), 'should not be empty')
  ok(!HALF.isEmpty(), 'should not be empty')
  ok(EMPTY.isEmpty(), 'should not empty')
})

test('center', t => {
  equal(UNIT.center(), 0.5)
  equal(NEG_UNIT.center(), -0.5)
  equal(HALF.center(), 0.5)
})

test('length', t => {
  equal(UNIT.length(), 1)
  equal(NEG_UNIT.length(), 1)
  equal(HALF.length(), 0)
})

test('contains', t => {
  ok(UNIT.contains(0.5))
  ok(UNIT.interiorContains(0.5))

  ok(UNIT.contains(0))
  ok(!UNIT.interiorContains(0))

  ok(UNIT.contains(1))
  ok(!UNIT.interiorContains(1))
})

test('operations', t => {
  ok(EMPTY.containsInterval(EMPTY))
  ok(EMPTY.interiorContainsInterval(EMPTY))
  ok(!EMPTY.intersects(EMPTY))
  ok(!EMPTY.interiorIntersects(EMPTY))

  ok(!EMPTY.containsInterval(UNIT))
  ok(!EMPTY.interiorContainsInterval(UNIT))
  ok(!EMPTY.intersects(UNIT))
  ok(!EMPTY.interiorIntersects(UNIT))

  ok(UNIT.containsInterval(HALF))
  ok(UNIT.interiorContainsInterval(HALF))
  ok(UNIT.intersects(HALF))
  ok(UNIT.interiorIntersects(HALF))

  ok(UNIT.containsInterval(UNIT))
  ok(!UNIT.interiorContainsInterval(UNIT))
  ok(UNIT.intersects(UNIT))
  ok(UNIT.interiorIntersects(UNIT))

  ok(UNIT.containsInterval(EMPTY))
  ok(UNIT.interiorContainsInterval(EMPTY))
  ok(!UNIT.intersects(EMPTY))
  ok(!UNIT.interiorIntersects(EMPTY))

  ok(!UNIT.containsInterval(NEG_UNIT))
  ok(!UNIT.interiorContainsInterval(NEG_UNIT))
  ok(UNIT.intersects(NEG_UNIT))
  ok(!UNIT.interiorIntersects(NEG_UNIT))

  const i = new Interval(0, 0.5)
  ok(UNIT.containsInterval(i))
  ok(!UNIT.interiorContainsInterval(i))
  ok(UNIT.intersects(i))
  ok(UNIT.interiorIntersects(i))

  ok(!HALF.containsInterval(i))
  ok(!HALF.interiorContainsInterval(i))
  ok(HALF.intersects(i))
  ok(!HALF.interiorIntersects(i))
})

test('intersection', t => {
  ok(UNIT.intersection(HALF).equal(HALF))
  ok(UNIT.intersection(NEG_UNIT).equal(new Interval(0, 0)))
  ok(NEG_UNIT.intersection(HALF).equal(EMPTY))
  ok(UNIT.intersection(EMPTY).equal(EMPTY))
  ok(EMPTY.intersection(UNIT).equal(EMPTY))
})

test('union', t => {
  ok(new Interval(99, 100).union(EMPTY).equal(new Interval(99, 100)))
  ok(EMPTY.union(new Interval(99, 100)).equal(new Interval(99, 100)))
  ok(new Interval(5, 3).union(new Interval(0, -2)).equal(EMPTY))
  ok(new Interval(0, -2).union(new Interval(5, 3)).equal(EMPTY))
  ok(UNIT.union(UNIT).equal(UNIT))
  ok(UNIT.union(NEG_UNIT).equal(new Interval(-1, 1)))
  ok(NEG_UNIT.union(UNIT).equal(new Interval(-1, 1)))
  ok(HALF.union(UNIT).equal(UNIT))
})

test('addPoint', t => {
  ok(EMPTY.addPoint(5).equal(new Interval(5, 5)))
  ok(new Interval(5, 5).addPoint(-1).equal(new Interval(-1, 5)))
  ok(new Interval(-1, 5).addPoint(0).equal(new Interval(-1, 5)))
  ok(new Interval(-1, 5).addPoint(6).equal(new Interval(-1, 6)))
})

test('clampPoint', t => {
  equal(new Interval(0.1, 0.4).clampPoint(0.3), 0.3)
  equal(new Interval(0.1, 0.4).clampPoint(-7.0), 0.1)
  equal(new Interval(0.1, 0.4).clampPoint(0.6), 0.4)
})

test('expanded', t => {
  ok(EMPTY.expanded(0.45).equal(EMPTY))
  ok(UNIT.expanded(0.5).equal(new Interval(-0.5, 1.5)))
  ok(UNIT.expanded(-0.5).equal(new Interval(0.5, 0.5)))
  ok(UNIT.expanded(-0.51).equal(EMPTY))
})

test('approxEqual', t => {
  // Choose two values lo and hi such that it's okay to shift an endpoint by
  // kLo (i.e., the resulting interval is equivalent) but not by kHi.
  const lo = 4 * 2.220446049250313e-16 // < max_error default
  const hi = 6 * 2.220446049250313e-16 // > max_error default

  // Empty intervals.
  ok(EMPTY.approxEqual(EMPTY))
  ok(new Interval(0, 0).approxEqual(EMPTY))
  ok(EMPTY.approxEqual(new Interval(0, 0)))
  ok(new Interval(1, 1).approxEqual(EMPTY))
  ok(EMPTY.approxEqual(new Interval(1, 1)))
  ok(!EMPTY.approxEqual(new Interval(0, 1)))
  ok(EMPTY.approxEqual(new Interval(1, 1 + 2 * lo)))
  ok(!EMPTY.approxEqual(new Interval(1, 1 + 2 * hi)))

  // Singleton intervals.
  ok(new Interval(1, 1).approxEqual(new Interval(1, 1)))
  ok(new Interval(1, 1).approxEqual(new Interval(1 - lo, 1 - lo)))
  ok(new Interval(1, 1).approxEqual(new Interval(1 + lo, 1 + lo)))
  ok(!new Interval(1, 1).approxEqual(new Interval(1 - hi, 1)))
  ok(!new Interval(1, 1).approxEqual(new Interval(1, 1 + hi)))
  ok(new Interval(1, 1).approxEqual(new Interval(1 - lo, 1 + lo)))
  ok(!new Interval(0, 0).approxEqual(new Interval(1, 1)))

  // Other intervals.
  ok(new Interval(1 - lo, 2 + lo).approxEqual(new Interval(1, 2)))
  ok(new Interval(1 + lo, 2 - lo).approxEqual(new Interval(1, 2)))
  ok(!new Interval(1 - hi, 2 + lo).approxEqual(new Interval(1, 2)))
  ok(!new Interval(1 + hi, 2 - lo).approxEqual(new Interval(1, 2)))
  ok(!new Interval(1 - lo, 2 + hi).approxEqual(new Interval(1, 2)))
  ok(!new Interval(1 + lo, 2 - hi).approxEqual(new Interval(1, 2)))
})

test('directedHausdorffDistance', t => {
  equal(EMPTY.directedHausdorffDistance(EMPTY), 0)
  equal(UNIT.directedHausdorffDistance(EMPTY), Infinity)
  equal(new Interval(1, 1).directedHausdorffDistance(new Interval(1, 1)), 0)
  equal(new Interval(1, 3).directedHausdorffDistance(new Interval(1, 1)), 2)
  equal(new Interval(1, 1).directedHausdorffDistance(new Interval(3, 5)), 2)
})

test('toString', t => {
  equal(new Interval(2, 4.5).toString(), '[2.0000000, 4.5000000]')
})
