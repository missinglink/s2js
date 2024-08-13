import { test, describe } from 'node:test'
import { equal, ok } from 'node:assert/strict'
import { remainder, nextAfter, float64Near, findLSBSetNonZero64, ldexp, ilogb } from './math'

describe('r1.math', () => {
  test('remainder', (t) => {
    equal(remainder(5.1, 2), -0.9000000000000004)
    equal(remainder(5.5, 2), -0.5)
    equal(remainder(-5.5, 2), 0.5)
    equal(remainder(5, 2.5), 0)
    equal(remainder(5.1, 0), NaN)
    equal(remainder(Infinity, 2), NaN)
    equal(remainder(5, NaN), NaN)
    equal(remainder(0, 2), 0)
    equal(remainder(5, 2), 1)
    equal(remainder(-5, 2), -1)
  })

  test('nextAfter', (t) => {
    equal(nextAfter(0, 1), 5e-324)
    equal(nextAfter(0, -1), -5e-324)
    equal(nextAfter(1, 2), 1.0000000000000002)
    equal(nextAfter(1, 0), 0.9999999999999999)
    equal(nextAfter(1, 1), 1)
    equal(nextAfter(Number.MAX_VALUE, Infinity), Infinity)
    equal(nextAfter(-Number.MAX_VALUE, -Infinity), -Infinity)
    equal(nextAfter(Number.NaN, 1), NaN)
    equal(nextAfter(1, Number.NaN), NaN)
  })

  test('float64Near', (t) => {
    ok(float64Near(0, 0, 0))
    ok(float64Near(1e-10, 1e-10 * 2, 1e-10))
    ok(!float64Near(1e-10, 1e-9, 1e-10))
    ok(!float64Near(1e-5, 1e-4, 1e-5 / 10))
  })

  test('findLSBSetNonZero64', (t) => {
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000001n), 0)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000010n), 1)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000100n), 2)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000001000n), 3)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000100000000000000000000000n), 23)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000001000000000000000000000000n), 24)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000010000000000000000000000000n), 25)
    equal(findLSBSetNonZero64(0b0000000000000000000000000100000000000000000000000000000000000000n), 38)
    equal(findLSBSetNonZero64(0b0000000000000000000000001000000000000000000000000000000000000000n), 39)
    equal(findLSBSetNonZero64(0b0000000000000000000000010000000000000000000000000000000000000000n), 40)
    equal(findLSBSetNonZero64(0b0000000010000000000000000000000000000000000000000000000000000000n), 55)
    equal(findLSBSetNonZero64(0b0000000100000000000000000000000000000000000000000000000000000000n), 56)
    equal(findLSBSetNonZero64(0b0000001000000000000000000000000000000000000000000000000000000000n), 57)
    equal(findLSBSetNonZero64(0b1000000000000000000000000000000000000000000000000000000000000000n), 63)
    equal(findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000000n), 64)
    equal(findLSBSetNonZero64(0b1000000000000000000000000000000000000000000000000000000000000000000n), 64)
  })

  test('ldexp', () => {
    // Test with positive exponent
    equal(ldexp(1.5, 2), 6)
    equal(ldexp(0.75, 1), 1.5)

    // Test with negative exponent
    equal(ldexp(1.5, -2), 0.375)
    equal(ldexp(4, -1), 2)

    // Test with zero exponent
    equal(ldexp(1.5, 0), 1.5)
    equal(ldexp(0.5, 0), 0.5)

    // Test with zero fraction
    equal(ldexp(0, 10), 0)
    equal(ldexp(0, -10), 0)

    // Test with large exponent
    equal(ldexp(1, 20), 1048576)
    equal(ldexp(2, 10), 2048)

    // Test with small fraction
    equal(ldexp(0.125, 3), 1)
    equal(ldexp(0.25, -2), 0.0625)
  })

  test('ilogb', () => {
    // Test with positive numbers
    equal(ilogb(1), 0)
    equal(ilogb(2), 1)
    equal(ilogb(4), 2)
    equal(ilogb(8), 3)

    // Test with numbers less than 1
    equal(ilogb(0.5), -1)
    equal(ilogb(0.25), -2)
    equal(ilogb(0.125), -3)

    // Test with large numbers
    equal(ilogb(1024), 10)
    equal(ilogb(2048), 11)

    // Test with numbers close to zero
    equal(ilogb(Number.MIN_VALUE), -1074) // Smallest positive number

    // Test with zero
    equal(ilogb(0), -Infinity)

    // Test with Infinity
    equal(ilogb(Infinity), Infinity)
    equal(ilogb(-Infinity), Infinity)

    // Test with NaN
    ok(isNaN(ilogb(NaN)))
  })
})
