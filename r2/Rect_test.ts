import test from 'node:test'
import { equal, deepEqual, ok } from 'node:assert/strict'
import { Rect } from './Rect'
import { Point } from './Point'
import { Interval } from '../r1/Interval'

// Some standard Rects for use throughout the tests.
const SW = new Point(0, 0.25)
const SE = new Point(0.5, 0.25)
const NE = new Point(0.5, 0.75)
const NW = new Point(0, 0.75)
const EMPTY = Rect.empty()
const RECT = Rect.fromPoints(SW, NE)
const RECT_MID = Rect.fromPoints(new Point(0.25, 0.5), new Point(0.25, 0.5))
const RECT_SW = Rect.fromPoints(SW, SW)
const RECT_NE = Rect.fromPoints(NE, NE)

test('empty', (t) => {
  ok(EMPTY.isValid())
  ok(EMPTY.isEmpty())
})

test('constructors', (t) => {
  ok(
    Rect.fromCenterSize(new Point(0.3, 0.5), new Point(0.2, 0.4)).approxEqual(
      Rect.fromPoints(new Point(0.2, 0.3), new Point(0.4, 0.7)),
    ),
  )
  ok(
    Rect.fromCenterSize(new Point(1, 0.1), new Point(0, 2)).approxEqual(
      Rect.fromPoints(new Point(1, -0.9), new Point(1, 1.1)),
    ),
  )
  ok(
    Rect.fromPoints(new Point(0.1, 0), new Point(0.25, 1)).approxEqual(
      Rect.fromPoints(new Point(0.1, 0), new Point(0.25, 1)),
    ),
  )
  ok(
    Rect.fromPoints(new Point(0.15, 0.3), new Point(0.35, 0.9)).approxEqual(
      Rect.fromPoints(new Point(0.15, 0.9), new Point(0.35, 0.3)),
    ),
  )
  ok(
    Rect.fromPoints(new Point(0.12, 0), new Point(0.83, 0.5)).approxEqual(
      Rect.fromPoints(new Point(0.83, 0), new Point(0.12, 0.5)),
    ),
  )
})

test('center', (t) => {
  deepEqual(EMPTY.center(), new Point(0.5, 0.5))
  deepEqual(RECT.center(), new Point(0.25, 0.5))
})

test('vertices', (t) => {
  deepEqual(RECT.vertices(), [SW, SE, NE, NW])
})

test('containsPoint', (t) => {
  ok(RECT.containsPoint(new Point(0.2, 0.4)))
  ok(!RECT.containsPoint(new Point(0.2, 0.8)))
  ok(!RECT.containsPoint(new Point(-0.1, 0.4)))
  ok(!RECT.containsPoint(new Point(0.6, 0.1)))
  ok(RECT.containsPoint(new Point(RECT.x.lo, RECT.y.lo)))
  ok(RECT.containsPoint(new Point(RECT.x.hi, RECT.y.hi)))
})

test('interiorContainsPoint', (t) => {
  // Check corners are not contained.
  ok(!RECT.interiorContainsPoint(SW))
  ok(!RECT.interiorContainsPoint(NE))
  // Check a point on the border is not contained.
  ok(!RECT.interiorContainsPoint(new Point(0, 0.5)))
  ok(!RECT.interiorContainsPoint(new Point(0.25, 0.25)))
  ok(!RECT.interiorContainsPoint(new Point(0.5, 0.5)))
  // Check points inside are contained.
  ok(RECT.interiorContainsPoint(new Point(0.125, 0.6)))
})

test('contains', (t) => {
  ok(RECT.contains(RECT_MID))
  ok(RECT.contains(RECT_SW))
  ok(RECT.contains(RECT_NE))
  ok(!RECT.contains(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))))
  ok(!RECT.contains(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))))
  ok(!RECT.contains(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))))
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).contains(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).contains(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).contains(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
  )
})

test('interiorContains', (t) => {
  ok(RECT.interiorContains(RECT_MID))
  ok(!RECT.interiorContains(RECT_SW))
  ok(!RECT.interiorContains(RECT_NE))
  ok(!RECT.interiorContains(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))))
  ok(!RECT.interiorContains(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))))
  ok(!RECT.interiorContains(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))))
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).interiorContains(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).interiorContains(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).interiorContains(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
  )
})

test('intersects', (t) => {
  ok(RECT.intersects(RECT_MID))
  ok(RECT.intersects(RECT_SW))
  ok(RECT.intersects(RECT_NE))
  ok(RECT.intersects(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))))
  ok(RECT.intersects(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))))
  ok(RECT.intersects(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))))
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).intersects(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).intersects(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).intersects(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
  )
})

test('interiorIntersects', (t) => {
  ok(RECT.interiorIntersects(RECT_MID))
  ok(!RECT.interiorIntersects(RECT_SW))
  ok(!RECT.interiorIntersects(RECT_NE))
  ok(RECT.interiorIntersects(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))))
  ok(!RECT.interiorIntersects(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))))
  ok(!RECT.interiorIntersects(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))))
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).interiorIntersects(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).interiorIntersects(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
  )
  ok(
    !Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).interiorIntersects(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
  )
})

test('union', (t) => {
  deepEqual(RECT.union(RECT_MID), RECT)
  deepEqual(RECT.union(RECT_SW), RECT)
  deepEqual(RECT.union(RECT_NE), RECT)
  deepEqual(
    RECT.union(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))),
    Rect.fromPoints(new Point(0, 0.1), new Point(0.75, 0.75)),
  )
  deepEqual(
    RECT.union(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))),
    Rect.fromPoints(new Point(0, 0.1), new Point(0.7, 0.75)),
  )
  deepEqual(
    RECT.union(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))),
    Rect.fromPoints(new Point(0, 0.1), new Point(0.7, 0.75)),
  )
  deepEqual(
    Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).union(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
    Rect.fromPoints(new Point(0.1, 0.2), new Point(0.2, 0.8)),
  )
  deepEqual(
    Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).union(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
    Rect.fromPoints(new Point(0, 0), new Point(0.4, 0.5)),
  )
  deepEqual(
    Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).union(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
    Rect.fromPoints(new Point(0, 0), new Point(0.3, 0.4)),
  )
})

test('intersection', (t) => {
  deepEqual(RECT.intersection(RECT_MID), RECT_MID)
  deepEqual(RECT.intersection(RECT_SW), RECT_SW)
  deepEqual(RECT.intersection(RECT_NE), RECT_NE)
  deepEqual(
    RECT.intersection(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.75, 0.3))),
    Rect.fromPoints(new Point(0.45, 0.25), new Point(0.5, 0.3)),
  )
  deepEqual(
    RECT.intersection(Rect.fromPoints(new Point(0.5, 0.1), new Point(0.7, 0.3))),
    Rect.fromPoints(new Point(0.5, 0.25), new Point(0.5, 0.3)),
  )
  deepEqual(
    RECT.intersection(Rect.fromPoints(new Point(0.45, 0.1), new Point(0.7, 0.25))),
    Rect.fromPoints(new Point(0.45, 0.25), new Point(0.5, 0.25)),
  )
  deepEqual(
    Rect.fromPoints(new Point(0.1, 0.2), new Point(0.1, 0.3)).intersection(
      Rect.fromPoints(new Point(0.15, 0.7), new Point(0.2, 0.8)),
    ),
    EMPTY,
  )
  deepEqual(
    Rect.fromPoints(new Point(0.1, 0.2), new Point(0.4, 0.5)).intersection(
      Rect.fromPoints(new Point(0, 0), new Point(0.2, 0.1)),
    ),
    EMPTY,
  )
  deepEqual(
    Rect.fromPoints(new Point(0.0, 0.0), new Point(0.1, 0.3)).intersection(
      Rect.fromPoints(new Point(0.2, 0.1), new Point(0.3, 0.4)),
    ),
    EMPTY,
  )
})

test('addPoint', (t) => {
  let r = Rect.empty()
  r = r.addPoint(SW)
  r = r.addPoint(SE)
  r = r.addPoint(NW)
  r = r.addPoint(new Point(0.1, 0.4))
  ok(RECT.approxEqual(r))
})

test('clampPoint', (t) => {
  const r = new Rect(new Interval(0, 0.5), new Interval(0.25, 0.75))

  deepEqual(r.clampPoint(new Point(-0.01, 0.24)), new Point(0, 0.25))
  deepEqual(r.clampPoint(new Point(-5.0, 0.48)), new Point(0, 0.48))
  deepEqual(r.clampPoint(new Point(-5.0, 2.48)), new Point(0, 0.75))
  deepEqual(r.clampPoint(new Point(0.19, 2.48)), new Point(0.19, 0.75))

  deepEqual(r.clampPoint(new Point(6.19, 2.48)), new Point(0.5, 0.75))
  deepEqual(r.clampPoint(new Point(6.19, 0.53)), new Point(0.5, 0.53))
  deepEqual(r.clampPoint(new Point(6.19, -2.53)), new Point(0.5, 0.25))
  deepEqual(r.clampPoint(new Point(0.33, -2.53)), new Point(0.33, 0.25))
  deepEqual(r.clampPoint(new Point(0.33, 0.37)), new Point(0.33, 0.37))
})

test('expanded (empty)', (t) => {
  ok(EMPTY.expanded(new Point(0.1, 0.3)).isEmpty())
  ok(EMPTY.expanded(new Point(-0.1, -0.3)).isEmpty())
  ok(Rect.fromPoints(new Point(0.2, 0.4), new Point(0.3, 0.7)).expanded(new Point(-0.1, -0.3)).isEmpty())
  ok(Rect.fromPoints(new Point(0.2, 0.4), new Point(0.3, 0.7)).expanded(new Point(0.1, -0.2)).isEmpty())
})

test('expanded', (t) => {
  ok(
    Rect.fromPoints(new Point(0.2, 0.4), new Point(0.3, 0.7))
      .expanded(new Point(0.1, 0.3))
      .approxEqual(Rect.fromPoints(new Point(0.1, 0.1), new Point(0.4, 1.0))),
  )
  ok(
    Rect.fromPoints(new Point(0.2, 0.4), new Point(0.3, 0.7))
      .expanded(new Point(0.1, -0.1))
      .approxEqual(Rect.fromPoints(new Point(0.1, 0.5), new Point(0.4, 0.6))),
  )
  ok(
    Rect.fromPoints(new Point(0.2, 0.4), new Point(0.3, 0.7))
      .expanded(new Point(0.1, 0.1))
      .approxEqual(Rect.fromPoints(new Point(0.1, 0.3), new Point(0.4, 0.8))),
  )
})
