import test from 'node:test'
import { equal } from 'node:assert/strict'
import * as bits from './bits.ts'

test('findLSBSetNonZero64', t => {
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000001n), 0)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000010n), 1)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000100n), 2)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000001000n), 3)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000010000n), 4)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000100000n), 5)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000001000000n), 6)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000010000000n), 7)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000100000000n), 8)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000010000000000000000000000000000000n), 31)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000001000000000000000000000000000000n), 30)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000100000000000000000000000000000n), 29)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000010000000000000000000000000000n), 28)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000001000000000000000000000000000n), 27)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000100000000000000000000000000n), 26)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000010000000000000000000000000n), 25)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000001000000000000000000000000n), 24)
  equal(bits.findLSBSetNonZero64(0b0000000000000000000000000000000000000000000000000000000000000000n), 64)
})