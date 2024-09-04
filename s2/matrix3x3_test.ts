import { test, describe } from 'node:test'
import { deepEqual, equal, ok } from 'node:assert/strict'
import { Vector } from '../r3/Vector'
import { Point } from './Point'
import * as matrix from './matrix3x3'
import { float64Near } from '../r1/math'

describe('s2.matrix3x3', () => {
  test('col', () => {
    const tests = [
      {
        have: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ],
        column: 0,
        want: Point.originPoint().vector
      },
      {
        have: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        column: 0,
        want: new Vector(1, 4, 7)
      },
      {
        have: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        column: 2,
        want: new Vector(3, 6, 9)
      }
    ]

    tests.forEach(({ have, column, want }) => {
      const got = matrix.col(have, column)
      ok(Point.fromVector(got).approxEqual(Point.fromVector(want)))
    })
  })

  test('row', () => {
    const tests = [
      {
        have: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ],
        row: 0,
        want: Point.originPoint().vector
      },
      {
        have: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        row: 0,
        want: new Vector(1, 2, 3)
      },
      {
        have: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        row: 2,
        want: new Vector(7, 8, 9)
      }
    ]

    tests.forEach(({ have, row, want }) => {
      const got = matrix.row(have, row)
      ok(Point.fromVector(got).approxEqual(Point.fromVector(want)), JSON.stringify({ got, want }))
    })
  })

  test('setCol', () => {
    const tests = [
      {
        m: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ],
        col: 0,
        point: new Vector(1, 1, 0),
        want: [
          [1, 0, 0],
          [1, 0, 0],
          [0, 0, 0]
        ]
      },
      {
        m: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        col: 2,
        point: new Vector(1, 1, 0),
        want: [
          [1, 2, 1],
          [4, 5, 1],
          [7, 8, 0]
        ]
      }
    ]

    tests.forEach(({ m, col, point, want }) => {
      deepEqual(matrix.setCol(m, col, point), want)
    })
  })

  test('setRow', () => {
    const tests = [
      {
        m: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ],
        row: 0,
        point: new Vector(1, 1, 0),
        want: [
          [1, 1, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      },
      {
        m: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        row: 2,
        point: new Vector(1, 1, 0),
        want: [
          [1, 2, 3],
          [4, 5, 6],
          [1, 1, 0]
        ]
      }
    ]

    tests.forEach(({ m, row, point, want }) => {
      deepEqual(matrix.setRow(m, row, point), want)
    })
  })

  test('scale', () => {
    const tests = [
      {
        m: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ],
        scale: 0,
        want: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ]
      },
      {
        m: [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1]
        ],
        scale: 5,
        want: [
          [5, 5, 5],
          [5, 5, 5],
          [5, 5, 5]
        ]
      },
      {
        m: [
          [-2, 2, -3],
          [-1, 1, 3],
          [2, 0, -1]
        ],
        scale: 2.75,
        want: [
          [-5.5, 5.5, -8.25],
          [-2.75, 2.75, 8.25],
          [5.5, 0, -2.75]
        ]
      }
    ]
    tests.forEach(({ m, scale, want }) => {
      deepEqual(matrix.scale(m, scale), want)
    })
  })

  test('mul', () => {
    const tests = [
      {
        m: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        point: new Vector(1, 1, 1),
        want: new Vector(6, 15, 24)
      }
    ]
    tests.forEach(({ m, point, want }) => {
      deepEqual(matrix.mul(m, point), want)
    })
  })

  test('determinant', () => {
    const tests = [
      {
        m: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        want: 0
      },
      {
        m: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1]
        ],
        want: 1
      },
      {
        m: [
          [-2, 2, -3],
          [-1, 1, 3],
          [2, 0, -1]
        ],
        want: 18
      }
    ]
    tests.forEach(({ m, want }) => {
      equal(matrix.det(m), want)
    })
  })

  test('transpose', () => {
    const tests = [
      {
        m: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        want: [
          [1, 4, 7],
          [2, 5, 8],
          [3, 6, 9]
        ]
      }
    ]
    tests.forEach(({ m, want }) => {
      deepEqual(matrix.transpose(m), want)
    })
  })

  test('toString', () => {
    const tests = [
      {
        have: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        want: '[ 1.0000 2.0000 3.0000 ] [ 4.0000 5.0000 6.0000 ] [ 7.0000 8.0000 9.0000 ]'
      },
      {
        have: [
          [1, 4, 7],
          [2, 5, 8],
          [3, 6, 9]
        ],
        want: '[ 1.0000 4.0000 7.0000 ] [ 2.0000 5.0000 8.0000 ] [ 3.0000 6.0000 9.0000 ]'
      }
    ]

    tests.forEach(({ have, want }) => {
      const got = matrix.toString(have)
      equal(got, want)
    })
  })

  test('frames', () => {
    const z = Point.fromCoords(0.2, 0.5, -3.3).vector
    const m = matrix.getFrame(z)

    ok(matrix.col(m, 0).isUnit())
    ok(matrix.col(m, 0).isUnit())
    ok(matrix.col(m, 1).isUnit())
    ok(float64Near(matrix.det(m), 1))

    const tests = [
      { a: matrix.col(m, 2), b: z },
      { a: matrix.toFrame(m, matrix.col(m, 0)), b: new Vector(1, 0, 0) },
      { a: matrix.toFrame(m, matrix.col(m, 1)), b: new Vector(0, 1, 0) },
      { a: matrix.toFrame(m, matrix.col(m, 2)), b: new Vector(0, 0, 1) },
      { a: matrix.fromFrame(m, new Vector(1, 0, 0)), b: matrix.col(m, 0) },
      { a: matrix.fromFrame(m, new Vector(0, 1, 0)), b: matrix.col(m, 1) },
      { a: matrix.fromFrame(m, new Vector(0, 0, 1)), b: matrix.col(m, 2) }
    ]

    tests.forEach(({ a, b }) => {
      ok(Point.fromVector(a).approxEqual(Point.fromVector(b)))
    })
  })
})
