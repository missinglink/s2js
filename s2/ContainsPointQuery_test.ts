import { test, describe } from 'node:test'
import { equal, ok, deepEqual } from 'node:assert/strict'
import { makeShapeIndex, parsePoint } from './testing_textformat'
import { Cap } from './Cap'
import { kmToAngle, randomFloat64, randomPoint, samplePointFromCap } from './testing'
import { Shape } from './Shape'
import { Loop } from './Loop'
import { ShapeIndex } from './ShapeIndex'
import {
  ContainsPointQuery,
  VERTEX_MODEL_CLOSED,
  VERTEX_MODEL_OPEN,
  VERTEX_MODEL_SEMI_OPEN
} from './ContainsPointQuery'

describe('s2.ContainsPointQuery', () => {
  test('VERTEX_MODEL_OPEN', () => {
    const index = makeShapeIndex('0:0 # -1:1, 1:1 # 0:5, 0:7, 2:6')
    const q = new ContainsPointQuery(index, VERTEX_MODEL_OPEN)

    const tests = [
      { pt: parsePoint('0:0'), want: false },
      { pt: parsePoint('-1:1'), want: false },
      { pt: parsePoint('1:1'), want: false },
      { pt: parsePoint('0:2'), want: false },
      { pt: parsePoint('0:3'), want: false },
      { pt: parsePoint('0:5'), want: false },
      { pt: parsePoint('0:7'), want: false },
      { pt: parsePoint('2:6'), want: false },
      { pt: parsePoint('1:6'), want: true },
      { pt: parsePoint('10:10'), want: false }
    ]

    for (const test of tests) {
      const got = q.contains(test.pt)
      equal(got, test.want, `query.contains(${test.pt}) = ${got}, want ${test.want}`)
    }

    equal(q.shapeContains(index.shape(1), parsePoint('1:6')), false, 'query.shapeContains(...) = true, want false')
    equal(q.shapeContains(index.shape(2), parsePoint('1:6')), true, 'query.shapeContains(...) = false, want true')
    equal(q.shapeContains(index.shape(2), parsePoint('0:5')), false, 'query.shapeContains(...) = true, want false')
    equal(q.shapeContains(index.shape(2), parsePoint('0:7')), false, 'query.shapeContains(...) = true, want false')
  })

  test('VERTEX_MODEL_SEMI_OPEN', () => {
    const index = makeShapeIndex('0:0 # -1:1, 1:1 # 0:5, 0:7, 2:6')
    const q = new ContainsPointQuery(index, VERTEX_MODEL_SEMI_OPEN)

    const tests = [
      { pt: parsePoint('0:0'), want: false },
      { pt: parsePoint('-1:1'), want: false },
      { pt: parsePoint('1:1'), want: false },
      { pt: parsePoint('0:2'), want: false },
      { pt: parsePoint('0:5'), want: false },
      { pt: parsePoint('0:7'), want: true },
      { pt: parsePoint('2:6'), want: false },
      { pt: parsePoint('1:6'), want: true },
      { pt: parsePoint('10:10'), want: false }
    ]

    for (const test of tests) {
      const got = q.contains(test.pt)
      equal(got, test.want, `query.contains(${test.pt}) = ${got}, want ${test.want}`)
    }

    equal(q.shapeContains(index.shape(1), parsePoint('1:6')), false, 'query.shapeContains(...) = true, want false')
    equal(q.shapeContains(index.shape(2), parsePoint('1:6')), true, 'query.shapeContains(...) = false, want true')
    equal(q.shapeContains(index.shape(2), parsePoint('0:5')), false, 'query.shapeContains(...) = true, want false')
    equal(q.shapeContains(index.shape(2), parsePoint('0:7')), true, 'query.shapeContains(...) = false, want true')
  })

  test('VERTEX_MODEL_CLOSED', () => {
    const index = makeShapeIndex('0:0 # -1:1, 1:1 # 0:5, 0:7, 2:6')
    const q = new ContainsPointQuery(index, VERTEX_MODEL_CLOSED)

    const tests = [
      { pt: parsePoint('0:0'), want: true },
      { pt: parsePoint('-1:1'), want: true },
      { pt: parsePoint('1:1'), want: true },
      { pt: parsePoint('0:2'), want: false },
      { pt: parsePoint('0:5'), want: true },
      { pt: parsePoint('0:7'), want: true },
      { pt: parsePoint('2:6'), want: true },
      { pt: parsePoint('1:6'), want: true },
      { pt: parsePoint('10:10'), want: false }
    ]

    for (const test of tests) {
      const got = q.contains(test.pt)
      equal(got, test.want, `query.contains(${test.pt}) = ${got}, want ${test.want}`)
    }

    equal(q.shapeContains(index.shape(1), parsePoint('1:6')), false, 'query.shapeContains(...) = true, want false')
    equal(q.shapeContains(index.shape(2), parsePoint('1:6')), true, 'query.shapeContains(...) = false, want true')
    equal(q.shapeContains(index.shape(2), parsePoint('0:5')), true, 'query.shapeContains(...) = false, want true')
    equal(q.shapeContains(index.shape(2), parsePoint('0:7')), true, 'query.shapeContains(...) = false, want true')
  })

  test('containingShapes', () => {
    const NUM_VERTICES_PER_LOOP = 10
    const MAX_LOOP_RADIUS = kmToAngle(10)
    const centerCap = Cap.fromCenterAngle(randomPoint(), MAX_LOOP_RADIUS)
    const index = new ShapeIndex()

    for (let i = 0; i < 100; i++) {
      index.add(
        Loop.regularLoop(samplePointFromCap(centerCap), randomFloat64() * MAX_LOOP_RADIUS, NUM_VERTICES_PER_LOOP)
      )
    }

    const query = new ContainsPointQuery(index, VERTEX_MODEL_SEMI_OPEN)

    for (let i = 0; i < 100; i++) {
      const p = samplePointFromCap(centerCap)
      const want: Shape[] = []

      for (let j = 0; j < index.shapes.size; j++) {
        const shape = index.shape(j)
        const loop = shape as Loop
        if (loop.containsPoint(p)) {
          ok(
            query.shapeContains(shape, p),
            `index.shape(${j}).containsPoint(${p}) = true, but query.shapeContains(${p}) = false`
          )
          want.push(shape)
        } else {
          ok(
            !query.shapeContains(shape, p),
            `query.shapeContains(shape, ${p}) = true, but the original loop does not contain the point.`
          )
        }
      }

      const got = query.containingShapes(p)
      deepEqual(got, want, `${i} query.containingShapes(${p}) = ${got}, want ${want}`)
    }
  })
})
