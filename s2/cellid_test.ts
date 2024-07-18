import test from 'node:test'
import { equal, ok } from 'node:assert/strict'
import * as cellid from './cellid'

test('face', t => {
  equal(cellid.face(0b0001111111111111111111111111111111111111111111111111111111111111n), 0)
  equal(cellid.face(0b0011111111111111111111111111111111111111111111111111111111111111n), 1)
  equal(cellid.face(0b0101111111111111111111111111111111111111111111111111111111111111n), 2)
  equal(cellid.face(0b0111111111111111111111111111111111111111111111111111111111111111n), 3)
  equal(cellid.face(0b1001111111111111111111111111111111111111111111111111111111111111n), 4)
  equal(cellid.face(0b1011111111111111111111111111111111111111111111111111111111111111n), 5)
})

test('level', t => {
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000000000000001n), 30)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000000000000100n), 29)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000000000010000n), 28)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000000001000000n), 27)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000000100000000n), 26)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000000010000000000n), 25)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000001000000000000n), 24)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000000100000000000000n), 23)
  equal(cellid.level(0b0000000000000000000000000000000000000000000000010000000000000000n), 22)
  equal(cellid.level(0b0000000000000000000000000000000000000000000001000000000000000000n), 21)
  equal(cellid.level(0b0000000000000000000000000000000000000000000100000000000000000000n), 20)
  equal(cellid.level(0b0000000000000000000000000000000000000000010000000000000000000000n), 19)
  equal(cellid.level(0b0000000000000000000000000000000000000001000000000000000000000000n), 18)
  equal(cellid.level(0b0000000000000000000000000000000000000100000000000000000000000000n), 17)
  equal(cellid.level(0b0000000000000000000000000000000000010000000000000000000000000000n), 16)
  equal(cellid.level(0b0000000000000000000000000000000001000000000000000000000000000000n), 15)
  equal(cellid.level(0b0000000000000000000000000000000100000000000000000000000000000000n), 14)
  equal(cellid.level(0b0000000000000000000000000000010000000000000000000000000000000000n), 13)
  equal(cellid.level(0b0000000000000000000000000001000000000000000000000000000000000000n), 12)
  equal(cellid.level(0b0000000000000000000000000100000000000000000000000000000000000000n), 11)
  equal(cellid.level(0b0000000000000000000000010000000000000000000000000000000000000000n), 10)
  equal(cellid.level(0b0000000000000000000001000000000000000000000000000000000000000000n), 9)
  equal(cellid.level(0b0000000000000000000100000000000000000000000000000000000000000000n), 8)
  equal(cellid.level(0b0000000000000000010000000000000000000000000000000000000000000000n), 7)
  equal(cellid.level(0b0000000000000001000000000000000000000000000000000000000000000000n), 6)
  equal(cellid.level(0b0000000000000100000000000000000000000000000000000000000000000000n), 5)
  equal(cellid.level(0b0000000000010000000000000000000000000000000000000000000000000000n), 4)
  equal(cellid.level(0b0000000001000000000000000000000000000000000000000000000000000000n), 3)
  equal(cellid.level(0b0000000100000000000000000000000000000000000000000000000000000000n), 2)
  equal(cellid.level(0b0000010000000000000000000000000000000000000000000000000000000000n), 1)
  equal(cellid.level(0b0001000000000000000000000000000000000000000000000000000000000000n), 0)
})

test('parent', t => {
  const c1 = /*            */ 0b0011110000111100001111000011110000000000000000000000000000000000n
  equal(cellid.parent(c1, 9), 0b0011110000111100001111000000000000000000000000000000000000000000n)
  equal(cellid.parent(c1, 5), 0b0011110000111100000000000000000000000000000000000000000000000000n)
  equal(cellid.parent(c1, 1), 0b0011110000000000000000000000000000000000000000000000000000000000n)
  equal(c1, /*             */ 0b0011110000111100001111000011110000000000000000000000000000000000n)

  const c2 = /*             */ 0b0011110000111100001111000011110000111100001111000011110000111101n
  equal(cellid.parent(c2, 30), 0b0011110000111100001111000011110000111100001111000011110000111101n)
  equal(cellid.parent(c2, 29), 0b0011110000111100001111000011110000111100001111000011110000111100n)
  equal(cellid.parent(c2, 15), 0b0011110000111100001111000011110001000000000000000000000000000000n)
  equal(cellid.parent(c2, 14), 0b0011110000111100001111000011110100000000000000000000000000000000n)
  equal(cellid.parent(c2, 1), 0b0011110000000000000000000000000000000000000000000000000000000000n)
  equal(cellid.parent(c2, 0), 0b0011000000000000000000000000000000000000000000000000000000000000n)
})

test('range', t => {
  const c1 = /*           */ 0b0011110000111100000001000000000000000000000000000000000000000000n
  equal(cellid.rangeMin(c1), 0b0011110000111100000000000000000000000000000000000000000000000001n)
  equal(cellid.rangeMax(c1), 0b0011110000111100000001111111111111111111111111111111111111111111n)

  const c2 = /*           */ 0b0011110000111100001111000011110001000000000000000000000000000000n
  equal(cellid.rangeMin(c2), 0b0011110000111100001111000011110000000000000000000000000000000001n)
  equal(cellid.rangeMax(c2), 0b0011110000111100001111000011110001111111111111111111111111111111n)
})

test('contains', t => {
  const c1 = 0b0011110000111100001111000011110000111100001111000011110000111101n
  ok(!cellid.contains(c1, cellid.parent(c1, 10)))
  ok(cellid.contains(cellid.parent(c1, 10), c1))

  const c2 = 0b1011111111111111111111111111111111111111111111111111111111111111n
  ok(!cellid.contains(c2, cellid.parent(c2, 10)))
  ok(cellid.contains(cellid.parent(c2, 10), c2))

  ok(!cellid.contains(c1, c2))
  ok(!cellid.contains(c2, c1))
})

test('intersects', t => {
  const c1 = 0b0011110000111100001111000011110000111100001111000011110000111101n
  ok(cellid.intersects(c1, cellid.parent(c1, 10)))
  ok(cellid.intersects(cellid.parent(c1, 10), c1))

  const c2 = 0b1011111111111111111111111111111111111111111111111111111111111111n
  ok(cellid.intersects(c2, cellid.parent(c2, 10)))
  ok(cellid.intersects(cellid.parent(c2, 10), c2))

  ok(cellid.intersects(c1, c1))
  ok(!cellid.intersects(c1, c2))
  ok(!cellid.intersects(c1, c2))
})

test('valid', t => {
  ok(cellid.valid(0b0000000000000000000000000000000000000000000000000000000000000001n))
  ok(!cellid.valid(0b1110000000000000000000000000000000000000000000000000000000000001n), 'face')
  ok(!cellid.valid(0b0000000000000000000000000000000000000000000000000000000000000010n), 'level')

  ok(!cellid.valid(0b0000000000000000000000000000000000000000000000000000000000000010n))
  ok(!cellid.valid(0b0000000000000000000000000000000000000000000000000000000000001000n))
})
