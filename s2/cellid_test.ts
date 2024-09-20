import { test, describe } from 'node:test'
import { equal, deepEqual, ok } from 'node:assert/strict'
import type { CellID } from './cellid'
import * as cellid from './cellid'
import { FACE_BITS, MAX_LEVEL, MAX_SIZE } from './cellid_constants'
import { LatLng } from './LatLng'
import { DEGREE } from '../s1/angle_constants'
import { Point } from './Point'
import { Point as R2Point } from '../r2/Point'
import { Rect as R2Rect } from '../r2/Rect'
import { float64Eq, randomCellID, randomUniformInt } from './testing'
import { float64Near, remainder } from '../r1/math'
import { MaxWidthMetric } from './Metric_constants'
import { uvToST, xyzToFaceUV } from './stuv'

describe('s2.cellid', () => {
  test('fromFace', () => {
    for (let face = 0; face < 6; face++) {
      const fpl = cellid.fromFacePosLevel(face, 0n, 0)
      const f = cellid.fromFace(face)
      equal(fpl, f)
    }
  })

  test('sentinel rangeMin / rangeMax', () => {
    const s = cellid.SentinelCellID
    equal(cellid.rangeMin(s), s)
    equal(cellid.rangeMax(s), s)
  })

  test('parent/child relationships', () => {
    const ci = cellid.fromFacePosLevel(3, BigInt('0x12345678'), MAX_LEVEL - 4)
    ok(cellid.valid(ci))
    equal(cellid.face(ci), 3)
    equal(cellid.pos(ci), BigInt('0x12345700'))
    equal(cellid.level(ci), 26)
    ok(!cellid.isLeaf(ci))

    let child = cellid.childBeginAtLevel(ci, cellid.level(ci) + 2)
    equal(cellid.pos(child), BigInt('0x12345610'))

    child = cellid.childBegin(ci)
    equal(cellid.pos(child), BigInt('0x12345640'))

    child = cellid.children(ci)[0]
    equal(cellid.pos(child), BigInt('0x12345640'))

    let parent = cellid.immediateParent(ci)
    equal(cellid.pos(parent), BigInt('0x12345400'))

    parent = cellid.parent(ci, cellid.level(ci) - 2)
    equal(cellid.pos(parent), BigInt('0x12345000'))

    ok(cellid.childBegin(ci) < ci)
    ok(cellid.childEnd(ci) > ci)

    child = cellid.childBegin(ci)
    child = cellid.next(child)
    child = cellid.next(child)
    child = cellid.next(child)
    child = cellid.next(child)
    equal(cellid.childEnd(ci), child)

    equal(cellid.rangeMin(ci), cellid.childBeginAtLevel(ci, MAX_LEVEL))
    equal(cellid.next(cellid.rangeMax(ci)), cellid.childEndAtLevel(ci, MAX_LEVEL))
  })

  test('containment', () => {
    const a = BigInt('0x80855c0000000000') // Pittsburg
    const b = BigInt('0x80855d0000000000') // child of a
    const c = BigInt('0x80855dc000000000') // child of b
    const d = BigInt('0x8085630000000000') // part of Pittsburg disjoint from a

    const tests: [CellID, CellID, boolean, boolean, boolean][] = [
      [a, a, true, true, true],
      [a, b, true, false, true],
      [a, c, true, false, true],
      [a, d, false, false, false],
      [b, b, true, true, true],
      [b, c, true, false, true],
      [b, d, false, false, false],
      [c, c, true, true, true],
      [c, d, false, false, false],
      [d, d, true, true, true]
    ]

    tests.forEach(([x, y, xContainsY, yContainsX, xIntersectsY]) => {
      equal(cellid.contains(x, y), xContainsY)
      equal(cellid.contains(y, x), yContainsX)
      equal(cellid.intersects(x, y), xIntersectsY)
    })
  })

  test('toString', () => {
    equal(cellid.toString(BigInt('0xbb04000000000000')), '5/31200')
    equal(cellid.toString(cellid.SentinelCellID), 'Invalid: ffffffffffffffff')
  })

  test('fromString', () => {
    const tests: [string, CellID][] = [
      ['3/', cellid.fromFace(3)],
      ['0/21', cellid.children(cellid.children(cellid.fromFace(0))[2])[1]],
      ['4/000000000000000000000000000000', cellid.rangeMin(cellid.fromFace(4))],
      ['4/0000000000000000000000000000000', 0n],
      ['', 0n],
      ['7/', 0n],
      [' /', 0n],
      ['3:0', 0n],
      ['3/ 12', 0n],
      ['3/1241', 0n]
    ]

    tests.forEach(([have, want]) => {
      const got = cellid.fromString(have)
      equal(got, want)
    })
  })

  test('lat/lng', () => {
    const tests: [CellID, number, number][] = [
      [BigInt('0x47a1cbd595522b39'), 49.703498679, 11.770681595],
      [BigInt('0x46525318b63be0f9'), 55.685376759, 12.588490937],
      [BigInt('0x52b30b71698e729d'), 45.486546517, -93.449700022],
      [BigInt('0x46ed8886cfadda85'), 58.299984854, 23.049300056],
      [BigInt('0x3663f18a24cbe857'), 34.36443904, 108.330699969],
      [BigInt('0x10a06c0a948cf5d'), -30.694551352, -30.048758753],
      [BigInt('0x2b2bfd076787c5df'), -25.285264027, 133.823116966],
      [BigInt('0xb09dff882a7809e1'), -75.000000031, 0.000000133],
      [BigInt('0x94daa3d000000001'), -24.694439215, -47.537363213],
      [BigInt('0x87a1000000000001'), 38.899730392, -99.901813021],
      [BigInt('0x4fc76d5000000001'), 81.647200334, -55.63171294],
      [BigInt('0x3b00955555555555'), 10.050986518, 78.29317061],
      [BigInt('0x1dcc469991555555'), -34.055420593, 18.551140038],
      [BigInt('0xb112966aaaaaaaab'), -69.219262171, 49.670072392]
    ]

    tests.forEach(([cid, lat, lng]) => {
      const l1 = LatLng.fromDegrees(lat, lng)
      const l2 = cellid.latLng(cid)
      ok(l1.distance(l2) <= 1e-9 * DEGREE) // ~0.1mm on earth.
      equal(cid, cellid.fromLatLng(l1))
    })
  })

  test('edgeNeighbors', () => {
    // Check the edge neighbors of face 1.
    const faces = [5, 3, 2, 0]
    const neighbors = cellid.edgeNeighbors(cellid.parent(cellid.fromFaceIJ(1, 0, 0), 0))
    neighbors.forEach((nbr, i) => {
      ok(cellid.isFace(nbr))
      equal(cellid.face(nbr), faces[i])
    })

    // Check the edge neighbors of the corner cells at all levels.
    // This case is trickier because it requires projecting onto adjacent faces.
    const maxIJ = MAX_SIZE - 1
    for (var lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const cid = cellid.parent(cellid.fromFaceIJ(1, 0, 0), lvl)
      // These neighbors were determined manually using the face and axis
      // relationships.
      const levelSizeIJ = cellid.sizeIJ(lvl)
      const want: CellID[] = [
        cellid.parent(cellid.fromFaceIJ(5, maxIJ, maxIJ), lvl),
        cellid.parent(cellid.fromFaceIJ(1, levelSizeIJ, 0), lvl),
        cellid.parent(cellid.fromFaceIJ(1, 0, levelSizeIJ), lvl),
        cellid.parent(cellid.fromFaceIJ(0, maxIJ, 0), lvl)
      ]
      cellid.edgeNeighbors(cid).forEach((nbr, i) => equal(nbr, want[i]))
    }
  })

  test('vertexNeighbors', () => {
    // Check the vertex neighbors of the center of face 2 at level 5.
    let cid = cellid.fromPoint(Point.fromCoords(0, 0, 1))
    let neighbors = cellid.vertexNeighbors(cid, 5)
    neighbors.sort(cellid.ascending)

    neighbors.forEach((nbr, n) => {
      let i = 1 << 29
      let j = 1 << 29
      if (n < 2) i--
      if (n === 0 || n === 3) j--
      const want = cellid.parent(cellid.fromFaceIJ(2, i, j), 5)
      equal(nbr, want, `CellID(${cid}).VertexNeighbors()[${n}] = ${nbr}, want ${want}`)
    })

    // Check the vertex neighbors of the corner of faces 0, 4, and 5.
    cid = cellid.fromFacePosLevel(0, 0n, MAX_LEVEL)
    neighbors = cellid.vertexNeighbors(cid, 0)
    neighbors.sort(cellid.ascending)

    equal(neighbors.length, 3)
    equal(neighbors[0], cellid.fromFace(0))
    equal(neighbors[1], cellid.fromFace(4))
  })

  test('allNeighbors', async () => {
    // Check that allNeighbors produces results that are consistent
    // with vertexNeighbors for a bunch of random cells.
    for (let i = 0; i < 1000; i++) {
      let cid = randomCellID()
      if (cellid.isLeaf(cid)) cid = cellid.immediateParent(cid)

      // testAllNeighbors computes approximately 2**(2*(diff+1)) cell ids,
      // so it's not reasonable to use large values of diff.
      const maxDiff = Math.min(6, MAX_LEVEL - cellid.level(cid) - 1)
      const lvl = cellid.level(cid) + randomUniformInt(maxDiff)

      // We compute allNeighbors, and then add in all the children of id
      // at the given level. We then compare this against the result of finding
      // all the vertex neighbors of all the vertices of children of id at the
      // given level. These should give the same result.
      let want: CellID[] = []
      let all = cellid.allNeighbors(cid, lvl)
      let begin = cellid.childBeginAtLevel(cid, lvl + 1)
      let end = cellid.childEndAtLevel(cid, lvl + 1)
      for (let c = begin; c !== end; c = cellid.next(c)) {
        all.push(cellid.immediateParent(c))
        want.push(...cellid.vertexNeighbors(c, lvl))
      }

      // Sort the results and eliminate duplicates
      all = [...new Set(all)].sort(cellid.ascending)
      want = [...new Set(want)].sort(cellid.ascending)

      deepEqual(all, want)
    }
  })

  test('tokens nominal', async () => {
    const tests: [string, CellID][] = [
      ['1', BigInt('0x1000000000000000')],
      ['3', BigInt('0x3000000000000000')],
      ['14', BigInt('0x1400000000000000')],
      ['41', BigInt('0x4100000000000000')],
      ['094', BigInt('0x0940000000000000')],
      ['537', BigInt('0x5370000000000000')],
      ['3fec', BigInt('0x3fec000000000000')],
      ['72f3', BigInt('0x72f3000000000000')],
      ['52b8c', BigInt('0x52b8c00000000000')],
      ['990ed', BigInt('0x990ed00000000000')],
      ['4476dc', BigInt('0x4476dc0000000000')],
      ['2a724f', BigInt('0x2a724f0000000000')],
      ['7d4afc4', BigInt('0x7d4afc4000000000')],
      ['b675785', BigInt('0xb675785000000000')],
      ['40cd6124', BigInt('0x40cd612400000000')],
      ['3ba32f81', BigInt('0x3ba32f8100000000')],
      ['08f569b5c', BigInt('0x08f569b5c0000000')],
      ['385327157', BigInt('0x3853271570000000')],
      ['166c4d1954', BigInt('0x166c4d1954000000')],
      ['96f48d8c39', BigInt('0x96f48d8c39000000')],
      ['0bca3c7f74c', BigInt('0x0bca3c7f74c00000')],
      ['1ae3619d12f', BigInt('0x1ae3619d12f00000')],
      ['07a77802a3fc', BigInt('0x07a77802a3fc0000')],
      ['4e7887ec1801', BigInt('0x4e7887ec18010000')],
      ['4adad7ae74124', BigInt('0x4adad7ae74124000')],
      ['90aba04afe0c5', BigInt('0x90aba04afe0c5000')],
      ['8ffc3f02af305c', BigInt('0x8ffc3f02af305c00')],
      ['6fa47550938183', BigInt('0x6fa4755093818300')],
      ['aa80a565df5e7fc', BigInt('0xaa80a565df5e7fc0')],
      ['01614b5e968e121', BigInt('0x01614b5e968e1210')],
      ['aa05238e7bd3ee7c', BigInt('0xaa05238e7bd3ee7c')],
      ['48a23db9c2963e5b', BigInt('0x48a23db9c2963e5b')]
    ]

    tests.forEach(([token, expected]) => {
      const actual = cellid.fromToken(token)
      equal(actual, expected)
      equal(cellid.toToken(actual), token)
    })
  })

  test('fromToken Error Cases', async (t) => {
    const noneToken = cellid.toToken(0n)
    equal(noneToken, 'X')

    const noneID = cellid.fromToken(noneToken)
    equal(noneID, 0n)

    // Sentinel is invalid.
    const sentinel = cellid.toToken(cellid.SentinelCellID)
    equal(cellid.fromToken(sentinel), cellid.SentinelCellID)

    // Test an invalid face
    const face7 = cellid.toToken(cellid.fromFace(7))
    equal(cellid.fromToken(face7), cellid.fromFace(7))

    // Testing various malformed tokens
    const tests = ['876b e99', '876bee99\n', '876[ee99', ' 876bee99']
    tests.forEach((token) => {
      const ci = cellid.fromToken(token)
      equal(ci, 0n, token)
    })
  })

  test('ijLevelToBoundUV', () => {
    const maxIJ = (1 << MAX_LEVEL) - 1

    const tests: [number, number, number, R2Rect][] = [
      // The i/j space is [0, 2^30 - 1) which maps to [-1, 1] for the
      // x/y axes of the face surface. Results are scaled by the size of a cell
      // at the given level. At level 0, everything is one cell of the full size
      // of the space.  At MAX_LEVEL, the bounding rect is almost floating point
      // noise.

      // What should be out of bounds values, but passes the C++ code as well.
      [-1, -1, 0, R2Rect.fromPoints(new R2Point(-5, -5), new R2Point(-1, -1))],
      [-1 * maxIJ, -1 * maxIJ, 0, R2Rect.fromPoints(new R2Point(-5, -5), new R2Point(-1, -1))],
      [
        -1,
        -1,
        MAX_LEVEL,
        R2Rect.fromPoints(new R2Point(-1.0000000024835267, -1.0000000024835267), new R2Point(-1, -1))
      ],
      [0, 0, MAX_LEVEL + 1, R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(-1, -1))],

      // // Minimum i,j at different levels
      [0, 0, 0, R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(1, 1))],
      [
        0,
        0,
        MAX_LEVEL / 2,
        R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(-0.999918621033430099, -0.999918621033430099))
      ],
      [
        0,
        0,
        MAX_LEVEL,
        R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(-0.99999999751647306, -0.99999999751647306))
      ],

      // Just a hair off the outer bounds at different levels.
      [1, 1, 0, R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(1, 1))],
      [
        1,
        1,
        MAX_LEVEL / 2,
        R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(-0.999918621033430099, -0.999918621033430099))
      ],
      [
        1,
        1,
        MAX_LEVEL,
        R2Rect.fromPoints(
          new R2Point(-0.9999999975164731, -0.9999999975164731),
          new R2Point(-0.9999999950329462, -0.9999999950329462)
        )
      ],

      // Center point of the i,j space at different levels.
      [maxIJ / 2, maxIJ / 2, 0, R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(1, 1))],
      [
        maxIJ / 2,
        maxIJ / 2,
        MAX_LEVEL / 2,
        R2Rect.fromPoints(new R2Point(-0.000040691345930099, -0.000040691345930099), new R2Point(0, 0))
      ],
      [
        maxIJ / 2,
        maxIJ / 2,
        MAX_LEVEL,
        R2Rect.fromPoints(new R2Point(-0.000000001241763433, -0.000000001241763433), new R2Point(0, 0))
      ],

      // Maximum i, j at different levels.
      [maxIJ, maxIJ, 0, R2Rect.fromPoints(new R2Point(-1, -1), new R2Point(1, 1))],
      [
        maxIJ,
        maxIJ,
        MAX_LEVEL / 2,
        R2Rect.fromPoints(new R2Point(0.999918621033430099, 0.999918621033430099), new R2Point(1, 1))
      ],
      [
        maxIJ,
        maxIJ,
        MAX_LEVEL,
        R2Rect.fromPoints(new R2Point(0.99999999751647306, 0.99999999751647306), new R2Point(1, 1))
      ]
    ]

    // @missinglink: the go code used epsilon=1e-10
    tests.forEach(([i, j, level, want]) => {
      const uv = cellid.ijLevelToBoundUV(i, j, level)
      ok(float64Near(uv.x.lo, want.x.lo, 1e-8))
      ok(float64Near(uv.x.hi, want.x.hi, 1e-8))
      ok(float64Near(uv.y.lo, want.y.lo, 1e-8))
      ok(float64Near(uv.y.hi, want.y.hi, 1e-8))
    })
  })

  test('commonAncestorLevel', () => {
    const tests: [CellID, CellID, number, boolean][] = [
      [cellid.fromFace(0), cellid.fromFace(0), 0, true],
      [cellid.childBeginAtLevel(cellid.fromFace(0), 30), cellid.childBeginAtLevel(cellid.fromFace(0), 30), 30, true],
      [cellid.childBeginAtLevel(cellid.fromFace(0), 30), cellid.fromFace(0), 0, true],
      [cellid.fromFace(5), cellid.prev(cellid.childEndAtLevel(cellid.fromFace(5), 30)), 0, true],
      [cellid.fromFace(0), cellid.fromFace(5), 0, false],
      [cellid.childBeginAtLevel(cellid.fromFace(2), 30), cellid.childBeginAtLevel(cellid.fromFace(3), 20), 0, false],
      [
        cellid.childBeginAtLevel(cellid.next(cellid.childBeginAtLevel(cellid.fromFace(5), 9)), 15),
        cellid.childBeginAtLevel(cellid.childBeginAtLevel(cellid.fromFace(5), 9), 20),
        8,
        true
      ],
      [
        cellid.childBeginAtLevel(cellid.childBeginAtLevel(cellid.fromFace(0), 2), 30),
        cellid.childBeginAtLevel(cellid.next(cellid.childBeginAtLevel(cellid.fromFace(0), 2)), 5),
        1,
        true
      ]
    ]

    tests.forEach(([ci, other, want, wantValid]) => {
      const [result, valid] = cellid.commonAncestorLevel(ci, other)
      ok(valid === wantValid && result === want)
    })
  })

  test('distanceFromBegin', () => {
    const tests = [
      [
        // at level 0 (i.e. full faces), there are only 6 cells from
        // the last face to the beginning of the Hilbert curve.
        cellid.childEndAtLevel(cellid.fromFace(5), 0),
        6n
      ],
      [
        // from the last cell on the last face at the smallest cell size,
        // there are the maximum number of possible cells.
        cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL),
        6n * (1n << BigInt(2 * MAX_LEVEL))
      ],
      [
        // from the first cell on the first face.
        cellid.childBeginAtLevel(cellid.fromFace(0), 0),
        0n
      ],
      [
        // from the first cell at the smallest level on the first face.
        cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL),
        0n
      ]
    ]

    tests.forEach(([id, want]) => {
      const got = cellid.distanceFromBegin(id)
      equal(got, want)
    })

    // Test that advancing from the beginning by the distance from a cell gets
    // us back to that cell.
    const id = cellid.fromFacePosLevel(3, BigInt('0x12345678'), MAX_LEVEL - 4)
    const got = cellid.advance(
      cellid.childBeginAtLevel(cellid.fromFace(0), cellid.level(id)),
      cellid.distanceFromBegin(id)
    )
    equal(got, id)
  })

  test('wrapping', () => {
    const id = cellid.fromFacePosLevel(3, BigInt('0x12345678'), MAX_LEVEL - 4)
    const tests = [
      {
        msg: 'test wrap from beginning to end of Hilbert curve',
        got: cellid.prev(cellid.childEndAtLevel(cellid.fromFace(5), 0)),
        want: cellid.prevWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 0))
      },
      {
        msg: 'smallest end leaf wraps to smallest first leaf using PrevWrap',
        got: cellid.fromFacePosLevel(5, cellid.SentinelCellID >> BigInt(FACE_BITS), MAX_LEVEL),
        want: cellid.prevWrap(cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL))
      },
      {
        msg: 'smallest end leaf wraps to smallest first leaf using AdvanceWrap',
        got: cellid.fromFacePosLevel(5, cellid.SentinelCellID >> BigInt(FACE_BITS), MAX_LEVEL),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL), -1n)
      },
      {
        msg: 'PrevWrap is the same as AdvanceWrap(-1)',
        got: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL), -1n),
        want: cellid.prevWrap(cellid.childBeginAtLevel(cellid.fromFace(0), MAX_LEVEL))
      },
      {
        msg: 'Prev + NextWrap stays the same at given level',
        got: cellid.childBeginAtLevel(cellid.fromFace(0), 4),
        want: cellid.nextWrap(cellid.prev(cellid.childEndAtLevel(cellid.fromFace(5), 4)))
      },
      {
        msg: 'AdvanceWrap forward and back stays the same at given level',
        got: cellid.childBeginAtLevel(cellid.fromFace(0), 4),
        want: cellid.advanceWrap(cellid.advance(cellid.childEndAtLevel(cellid.fromFace(5), 4), -1n), 1n)
      },
      {
        msg: 'Prev().NextWrap() stays same for first cell at level',
        got: cellid.fromFacePosLevel(0, 0n, MAX_LEVEL),
        want: cellid.nextWrap(cellid.prev(cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL)))
      },
      {
        msg: 'AdvanceWrap forward and back stays same for first cell at level',
        got: cellid.fromFacePosLevel(0, 0n, MAX_LEVEL),
        want: cellid.advanceWrap(cellid.advance(cellid.childEndAtLevel(cellid.fromFace(5), MAX_LEVEL), -1n), 1n)
      },
      {
        msg: 'advancing 7 steps around cube should end up one past start.',
        got: cellid.fromFace(1),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 0), 7n)
      },
      {
        msg: 'twice around should end up where we started',
        got: cellid.childBeginAtLevel(cellid.fromFace(0), 0),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 0), 12n)
      },
      {
        msg: 'backwards once around plus one step should be one before we started',
        got: cellid.fromFace(4),
        want: cellid.advanceWrap(cellid.fromFace(5), -7n)
      },
      {
        msg: 'wrapping even multiple of times around should end where we started',
        got: cellid.childBeginAtLevel(cellid.fromFace(0), 0),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 0), -12000000n)
      },
      {
        msg: 'wrapping combination of even times around should end where it started',
        got: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 5), 6644n),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(cellid.fromFace(0), 5), -11788n)
      },
      {
        msg: 'moving 256 should advance us one cell at max level',
        got: cellid.childBeginAtLevel(cellid.next(id), MAX_LEVEL),
        want: cellid.advanceWrap(cellid.childBeginAtLevel(id, MAX_LEVEL), 256n)
      },
      {
        msg: 'wrapping by 4 times cells per face should advance 4 faces',
        got: cellid.fromFacePosLevel(1, 0n, MAX_LEVEL),
        want: cellid.advanceWrap(cellid.fromFacePosLevel(5, 0n, MAX_LEVEL), 2n << BigInt(2 * MAX_LEVEL))
      }
    ]

    tests.forEach((test) => {
      equal(test.got, test.want, `${test.got}, ${test.want} - ${test.msg}`)
    })
  })

  test('advance', () => {
    const tests = [
      {
        ci: cellid.childBeginAtLevel(cellid.fromFace(0), 0),
        steps: 7n,
        want: cellid.childEndAtLevel(cellid.fromFace(5), 0)
      },
      {
        ci: cellid.childBeginAtLevel(cellid.fromFace(0), 0),
        steps: 12n,
        want: cellid.childEndAtLevel(cellid.fromFace(5), 0)
      },
      {
        ci: cellid.childEndAtLevel(cellid.fromFace(5), 0),
        steps: -7n,
        want: cellid.childBeginAtLevel(cellid.fromFace(0), 0)
      },
      {
        ci: cellid.childEndAtLevel(cellid.fromFace(5), 0),
        steps: -12000000n,
        want: cellid.childBeginAtLevel(cellid.fromFace(0), 0)
      },
      {
        ci: cellid.childBeginAtLevel(cellid.fromFace(0), 5),
        steps: 500n,
        want: cellid.advance(cellid.childEndAtLevel(cellid.fromFace(5), 5), 500n - (6n << (2n * 5n)))
      },
      {
        ci: cellid.childBeginAtLevel(cellid.fromFacePosLevel(3, BigInt('0x12345678'), MAX_LEVEL - 4), MAX_LEVEL),
        steps: 256n,
        want: cellid.childBeginAtLevel(
          cellid.next(cellid.fromFacePosLevel(3, BigInt('0x12345678'), MAX_LEVEL - 4)),
          MAX_LEVEL
        )
      },
      {
        ci: cellid.childBeginAtLevel(cellid.fromFace(1), MAX_LEVEL),
        steps: 4n << BigInt(2 * MAX_LEVEL),
        want: cellid.childBeginAtLevel(cellid.fromFace(5), MAX_LEVEL)
      }
    ]

    tests.forEach(({ ci, steps, want }) => {
      const got = cellid.advance(ci, steps)
      equal(got, want)
    })
  })

  test('faceSiTi', () => {
    const id = cellid.fromFacePosLevel(3, BigInt(0x12345678), MAX_LEVEL)
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const l = MAX_LEVEL - level
      const want = 1 << level
      const mask = (1 << (level + 1)) - 1

      const { si, ti } = cellid.faceSiTi(cellid.parent(id, l))
      equal(si & mask, want, `si at level ${l} did not match`)
      equal(ti & mask, want, `ti at level ${l} did not match`)
    }
  })

  test('continuity', () => {
    const maxWalkLevel = 8
    const cellSize = 1.0 / (1 << maxWalkLevel)

    // Make sure that sequentially increasing cell ids form a continuous
    // path over the surface of the sphere, i.e. there are no
    // discontinuous jumps from one region to another.
    const maxDist = MaxWidthMetric.value(maxWalkLevel)
    const end = cellid.childEndAtLevel(cellid.fromFace(5), maxWalkLevel)
    let id = cellid.childBeginAtLevel(cellid.fromFace(0), maxWalkLevel)

    for (; id != end; id = cellid.next(id)) {
      const nextWrapped = cellid.nextWrap(id)
      const rawPointCurrent = cellid.rawPoint(id)
      const rawPointNextWrapped = cellid.rawPoint(nextWrapped)

      const angle = rawPointCurrent.angle(rawPointNextWrapped)
      ok(angle <= maxDist, `Discontinuity detected: ${angle} > ${maxDist}`)

      deepEqual(nextWrapped, cellid.advanceWrap(id, 1n), 'NextWrap does not match AdvanceWrap(1)')
      deepEqual(id, cellid.advanceWrap(nextWrapped, -1n), 'AdvanceWrap(-1) does not bring back to original')

      // Check that the rawPoint() returns the center of each cell in (s,t) coordinates.
      const [_, u, v] = xyzToFaceUV(rawPointCurrent)
      equal(float64Eq(remainder(uvToST(u), 0.5 * cellSize), 0.0), true, `s-coordinate does not align to cell size`)
      equal(float64Eq(remainder(uvToST(v), 0.5 * cellSize), 0.0), true, `t-coordinate does not align to cell size`)
    }
  })
})
