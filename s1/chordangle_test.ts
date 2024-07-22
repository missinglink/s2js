import test from 'node:test'
import { equal, ok } from 'node:assert/strict'

import type { ChordAngle } from './chordangle'
import * as angle from './angle'
import * as chordangle from './chordangle'
import { NEGATIVE_CHORDANGLE, RIGHT_CHORDANGLE, STRAIGHT_CHORDANGLE, ZERO_CHORDANGLE } from './chordangle_constants'
import { DEGREE } from './angle_constants'
import { float64Near } from '../r1/math'

test('basics', () => {
  const tests: [ChordAngle, ChordAngle, boolean ,boolean][] = [
    [ NEGATIVE_CHORDANGLE, NEGATIVE_CHORDANGLE, false, true ],
    [ NEGATIVE_CHORDANGLE, 0, true, false ],
    [ NEGATIVE_CHORDANGLE, STRAIGHT_CHORDANGLE, true, false ],
    [ NEGATIVE_CHORDANGLE, chordangle.infChordAngle(), true, false ],

    [ ZERO_CHORDANGLE, ZERO_CHORDANGLE, false, true ],
    [ ZERO_CHORDANGLE, STRAIGHT_CHORDANGLE, true, false ],
    [ ZERO_CHORDANGLE, chordangle.infChordAngle(), true, false ],

    [ STRAIGHT_CHORDANGLE, STRAIGHT_CHORDANGLE, false, true ],
    [ STRAIGHT_CHORDANGLE, chordangle.infChordAngle(), true, false ],

    [ chordangle.infChordAngle(), chordangle.infChordAngle(), false, true ],
    [ chordangle.infChordAngle(), STRAIGHT_CHORDANGLE, false, false ],
  ]

  tests.forEach(([a, b, isLessThan, isEqual]) => {
    equal(a < b, isLessThan, `${a} should be less than ${b}`)
    equal(a === b, isEqual, `${a} should be equal to ${b}`)
  })
})

test('angle equality', () => {
  const oneEighty = 180*DEGREE
  equal(angle.infAngle(), chordangle.angle(chordangle.infChordAngle()), 'Infinite ChordAngle to Angle should match')
  equal(chordangle.angle(STRAIGHT_CHORDANGLE), oneEighty)
  equal(chordangle.angle(0), 0)

  const d = angle.degrees(chordangle.angle(RIGHT_CHORDANGLE))
  ok(float64Near(90, d, 1e-13))
})

test('is* functions', () => {
  const tests : [number, boolean, boolean ,boolean, boolean][] = [
    [0, false, true, false, false ],
    [NEGATIVE_CHORDANGLE, true, false, false, true ],
    [STRAIGHT_CHORDANGLE, false, false, false, false ],
    [chordangle.infChordAngle(), false, false, true, true ],
  ]

  tests.forEach(([have, isNegative, isZero, isInf, isSpecial]) => {
    equal(have < 0, isNegative)
    equal(have == 0, isZero)
    equal(chordangle.isInfinity(have), isInf)
    equal(chordangle.isSpecial(have), isSpecial)
  })
})

test('successor', () => {
  equal(chordangle.successor(NEGATIVE_CHORDANGLE), 0, 'NegativeChordAngle.Successor() should be 0')
  equal(chordangle.successor(STRAIGHT_CHORDANGLE), chordangle.infChordAngle(), 'StraightChordAngle.Successor() should be Infinity')
  equal(chordangle.successor(chordangle.infChordAngle()), chordangle.infChordAngle(), 'InfChordAngle.Successor() should be Infinity')

  let x = NEGATIVE_CHORDANGLE
  for (let i = 0; i < 10; i++) {
    ok(x < chordangle.successor(x), `${i}. ${x} >= ${chordangle.successor(x)}, want <`)
    x = chordangle.successor(x)
  }
})

test('predecessor', () => {
  equal(chordangle.predecessor(chordangle.infChordAngle()), STRAIGHT_CHORDANGLE, 'InfChordAngle.Predecessor() should be StraightChordAngle')
  equal(chordangle.predecessor(0), NEGATIVE_CHORDANGLE, 'Zero ChordAngle.Predecessor() should be NegativeChordAngle')
  equal(chordangle.predecessor(NEGATIVE_CHORDANGLE), NEGATIVE_CHORDANGLE, 'NegativeChordAngle.Predecessor() should be NegativeChordAngle')

  let x = chordangle.infChordAngle()
  for (let i = 0; i < 10; i++) {
    ok(x > chordangle.predecessor(x), `${x} <= ${chordangle.predecessor(x)}, want >`)
    x = chordangle.predecessor(x)
  }
})

test('fromAngle', () => {
  [0, 1, -1, Math.PI].forEach(a => {
    equal(chordangle.angle(chordangle.fromAngle(a)), a)
  })

  equal(chordangle.fromAngle(Math.PI), STRAIGHT_CHORDANGLE)
  equal(chordangle.fromAngle(angle.infAngle()), chordangle.infChordAngle(), 'converting infinite Angle to ChordAngle should yield infinite Angle')
})

test('arithmetic', () => {
  const degree0 = 0
  const degree30 = chordangle.fromAngle(30 * DEGREE)
  const degree60 = chordangle.fromAngle(60 * DEGREE)
  const degree90 = chordangle.fromAngle(90 * DEGREE)
  const degree120 = chordangle.fromAngle(120 * DEGREE)
  const degree180 = STRAIGHT_CHORDANGLE

  const addTests: [ChordAngle, ChordAngle, ChordAngle][] = [
    [ degree0, degree0, degree0 ],
    [ degree60, degree0, degree60 ],
    [ degree0, degree60, degree60 ],
    [ degree30, degree60, degree90 ],
    [ degree60, degree30, degree90 ],
    [ degree180, degree0, degree180 ],
    [ degree60, degree30, degree90 ],
    [ degree90, degree90, degree180 ],
    [ degree120, degree90, degree180 ],
    [ degree120, degree120, degree180 ],
    [ degree30, degree180, degree180 ],
    [ degree180, degree180, degree180 ],
  ]

  const subTests: [ChordAngle, ChordAngle, ChordAngle][] = [
    [ degree0, degree0, degree0 ],
    [ degree60, degree60, degree0 ],
    [ degree180, degree180, degree0 ],
    [ degree0, degree60, degree0 ],
    [ degree30, degree90, degree0 ],
    [ degree90, degree30, degree60 ],
    [ degree90, degree60, degree30 ],
    [ degree180, degree0, degree180 ],
  ]

  addTests.forEach(([a, b, want]) => {
    ok(float64Near(chordangle.add(a, b), want, 1e-13), `${chordangle.add(a, b)}, want ${want}`)
  })
  subTests.forEach(([a, b, want]) => {
    ok(float64Near(chordangle.sub(a, b), want, 1e-13), `${chordangle.sub(a, b)}, want ${want}`)
  })
})

test('trigonometry', () => {
  const epsilon = 1e-14
  for (let i = 0; i <= 40; i++) {
    const radians = Math.PI * i / 40
    const ca = chordangle.fromAngle(radians)
    ok(float64Near(Math.sin(radians), chordangle.sin(ca), epsilon))
    ok(float64Near(Math.cos(radians), chordangle.cos(ca), epsilon))
    ok(float64Near(Math.atan(Math.tan(radians)), Math.atan(chordangle.tan(ca)), epsilon))
  }

  const angle90 = chordangle.fromSquaredLength(2)
  const angle180 = chordangle.fromSquaredLength(4)
  equal(chordangle.sin(angle90), 1)
  equal(chordangle.cos(angle90), 0)
  equal(chordangle.tan(angle90), Infinity)
  equal(chordangle.sin(angle180), 0)
  equal(chordangle.cos(angle180), -1)
  equal(chordangle.tan(angle180), 0)
})

test('expanded', () => {
  const tests: [ChordAngle, number, ChordAngle][] = [
    [ NEGATIVE_CHORDANGLE, 5, chordangle.expanded(NEGATIVE_CHORDANGLE, 5) ],
    [ chordangle.infChordAngle(), -5, chordangle.infChordAngle() ],
    [ STRAIGHT_CHORDANGLE, 5, chordangle.fromSquaredLength(5) ],
    [ ZERO_CHORDANGLE, -5, ZERO_CHORDANGLE ],
    [ chordangle.fromSquaredLength(1.25), 0.25, chordangle.fromSquaredLength(1.5) ],
    [ chordangle.fromSquaredLength(0.75), 0.25, chordangle.fromSquaredLength(1) ],
  ]

  tests.forEach(([have, add, want]) => {
    equal(chordangle.expanded(have, add), want)
  })
})