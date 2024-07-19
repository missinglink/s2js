import test from 'node:test'
import { equal, ok } from 'node:assert/strict'
import * as angle from './angle'
import { DEGREE, RADIAN, E5, E6, E7 } from './angle_constants'

test('empty', t => {
  equal(0, angle.radians(0))
})

test('PI radians exactly 180 degrees', t => {
  equal(angle.radians(Math.PI * RADIAN), Math.PI, '(π * Radian).Radians() was %v, want π')
  equal(angle.degrees(Math.PI * RADIAN), 180, '(π * Radian).Degrees() was %v, want 180')
  equal(angle.radians(180 * DEGREE), Math.PI, '(180 * Degree).Radians() was %v, want π')
  equal(angle.degrees(180 * DEGREE), 180, '(180 * Degree).Degrees() was %v, want 180')

  equal(angle.degrees((Math.PI / 2) * RADIAN), 90, '(π/2 * Radian).Degrees() was %v, want 90')

  // Check negative angles.
  equal(angle.degrees((-Math.PI / 2) * RADIAN), -90, '(-π/2 * Radian).Degrees() was %v, want -90')
  equal(angle.radians(-45 * DEGREE), -Math.PI / 4, '(-45 * Degree).Radians() was %v, want -π/4')
})

test('E5/E6/E7 representation', t => {
  ok(Math.abs(angle.radians(-45 * DEGREE) - angle.radians(-4500000 * E5)) <= 1e-15)
  equal(angle.radians(-60 * DEGREE), angle.radians(-60000000 * E6))
  equal(angle.radians(-75 * DEGREE), angle.radians(-750000000 * E7))

  equal(-17256123, angle.e5(-172.56123 * DEGREE))
  equal(12345678, angle.e6(12.345678 * DEGREE))
  equal(-123456789, angle.e7(-12.3456789 * DEGREE))

  equal(angle.e5(0.500000001 * 1e-5 * DEGREE), 1)
  equal(angle.e6(0.500000001 * 1e-6 * DEGREE), 1)
  equal(angle.e7(0.500000001 * 1e-7 * DEGREE), 1)

  equal(angle.e5(-0.500000001 * 1e-5 * DEGREE), -1)
  equal(angle.e6(-0.500000001 * 1e-6 * DEGREE), -1)
  equal(angle.e7(-0.500000001 * 1e-7 * DEGREE), -1)

  equal(angle.e5(0.499999999 * 1e-5 * DEGREE), 0)
  equal(angle.e6(0.499999999 * 1e-6 * DEGREE), 0)
  equal(angle.e7(0.499999999 * 1e-7 * DEGREE), 0)

  equal(angle.e5(-0.499999999 * 1e-5 * DEGREE), 0)
  equal(angle.e6(-0.499999999 * 1e-6 * DEGREE), 0)
  equal(angle.e7(-0.499999999 * 1e-7 * DEGREE), 0)
})

test('normalize correctly canonicalizes angles', t => {
  equal(angle.normalized(360 * DEGREE), 0 * DEGREE)
  equal(angle.normalized(-90 * DEGREE), -90 * DEGREE)
  equal(angle.normalized(-180 * DEGREE), 180 * DEGREE)
  equal(angle.normalized(180 * DEGREE), 180 * DEGREE)
  equal(angle.normalized(540 * DEGREE), 180 * DEGREE)
  equal(angle.normalized(-270 * DEGREE), 90 * DEGREE)
})

test('toString', t => {
  equal(angle.toString(180 * DEGREE), '180.0000000')
})

test('degrees vs. radians', t => {
  // This test tests the exactness of specific values between degrees and radians.
  for (let k = -8; k <= 8; k++) {
    equal(45 * k * DEGREE, ((k * Math.PI) / 4) * RADIAN)
    equal(angle.degrees(45 * k * DEGREE), 45 * k)
  }

  for (let k = 0; k < 30; k++) {
    const m = 1 << k
    equal((180 / m) * DEGREE, Math.PI / (1 * m))
    equal((60 / m) * DEGREE, Math.PI / (3 * m))
    equal((36 / m) * DEGREE, Math.PI / (5 * m))
    equal((20 / m) * DEGREE, Math.PI / (9 * m))
    equal((4 / m) * DEGREE, Math.PI / (45 * m))
  }

  // We also spot check a non-identity.
  // @missinglink: this fails for epsilon=1e-15
  ok(angle.approxEqual(angle.degrees(60 * DEGREE), 60, 1e-14))
})
