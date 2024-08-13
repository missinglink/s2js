import { test, describe } from 'node:test'
import { strict as assert } from 'node:assert'

import { MAX_LEVEL } from './cellid_constants'
import {
  AvgAngleSpanMetric,
  AvgAreaMetric,
  AvgDiagMetric,
  AvgEdgeMetric,
  AvgWidthMetric,
  MaxAngleSpanMetric,
  MaxAreaMetric,
  MaxDiagAspect,
  MaxDiagMetric,
  MaxEdgeAspect,
  MaxEdgeMetric,
  MaxWidthMetric,
  MinAngleSpanMetric,
  MinAreaMetric,
  MinDiagMetric,
  MinEdgeMetric,
  MinWidthMetric,
} from './Metric_constants'

describe('s2.Metric', () => {
  test('metric', () => {
    let got = MinWidthMetric.maxLevel(0.001256)
    assert.equal(got, 9)

    assert.ok(MaxEdgeAspect >= 1)

    got = MaxEdgeMetric.deriv / MinEdgeMetric.deriv
    assert.ok(MaxEdgeAspect <= got)

    assert.ok(MaxDiagAspect >= 1)

    got = MaxDiagMetric.deriv / MinDiagMetric.deriv
    assert.ok(MaxDiagAspect <= got)

    got = MinWidthMetric.deriv * MinEdgeMetric.deriv - 1e-15
    assert.ok(MinAreaMetric.deriv >= got)

    got = MaxWidthMetric.deriv * MaxEdgeMetric.deriv + 1e-15
    assert.ok(MaxAreaMetric.deriv <= got)

    for (let level = -2; level <= MAX_LEVEL + 3; level++) {
      let width = MinWidthMetric.deriv * Math.pow(2, -level)
      if (level >= MAX_LEVEL + 3) width = 0

      // Check boundary cases (exactly equal to a threshold value).
      const expected = Math.max(0, Math.min(MAX_LEVEL, level))
      assert.equal(MinWidthMetric.minLevel(width), expected)
      assert.equal(MinWidthMetric.maxLevel(width), expected)
      assert.equal(MinWidthMetric.closestLevel(width), expected)

      // Also check non-boundary cases.
      assert.equal(MinWidthMetric.minLevel(1.2 * width), expected)
      assert.equal(MinWidthMetric.maxLevel(0.8 * width), expected)
      assert.equal(MinWidthMetric.closestLevel(1.2 * width), expected)
      assert.equal(MinWidthMetric.closestLevel(0.8 * width), expected)
    }
  })

  test('size relations', () => {
    // check that min <= avg <= max for each metric.
    const tests = [
      { min: MinAngleSpanMetric, avg: AvgAngleSpanMetric, max: MaxAngleSpanMetric },
      { min: MinWidthMetric, avg: AvgWidthMetric, max: MaxWidthMetric },
      { min: MinEdgeMetric, avg: AvgEdgeMetric, max: MaxEdgeMetric },
      { min: MinDiagMetric, avg: AvgDiagMetric, max: MaxDiagMetric },
      { min: MinAreaMetric, avg: AvgAreaMetric, max: MaxAreaMetric },
    ]

    tests.forEach((test) => {
      assert.ok(test.min.deriv <= test.avg.deriv)
      assert.ok(test.avg.deriv <= test.max.deriv)
    })
  })
})
