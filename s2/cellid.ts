import { findLSBSetNonZero64, nextAfter } from '../r1/math'
import lookupIJ, { INVERT_MASK, LOOKUP_BITS, lookupPos, SWAP_MASK } from './lookupIJ'
import { faceSiTiToXYZ, faceUVToXYZ, siTiToST, stToUV, uvToST, xyzToFaceUV } from './stuv'
import { FACE_BITS, MAX_LEVEL, MAX_SIZE, NUM_FACES, POS_BITS } from './cellid_constants'
import { LatLng } from './LatLng'
import { Point } from './Point'
import { clampInt } from './util'
import { Vector } from '../r3/Vector'
import { Interval } from '../r1/Interval'
import { Rect } from '../r2/Rect'
import { Point as R2Point } from '../r2/Point'

export type CellID = bigint

/**
 * Returns the cube face for this cell id, in the range [0,5].
 */
export const face = (ci: CellID): number => {
  return Number(ci >> BigInt(POS_BITS))
}

/**
 * Returns the position along the Hilbert curve of this cell id, in the range [0,2^POS_BITS-1].
 */
export const pos = (ci: CellID): CellID => {
  return ci & (~0n >> BigInt(FACE_BITS))
}

/**
 * Returns the subdivision level of this cell id, in the range [0, MAX_LEVEL].
 */
export const level = (ci: CellID): number => {
  return MAX_LEVEL - (findLSBSetNonZero64(ci) >>> 1)
}

/**
 * Returns the cell id at the given level, which must be no greater than the current level.
 */
export const parent = (ci: CellID, level: number): CellID => {
  const lsb = lsbForLevel(level)
  return (ci & -lsb) | lsb
}

/**
 * Returns true is cell id is valid.
 */
export const valid = (ci: CellID): boolean => {
  if (typeof ci !== 'bigint' || BigInt.asUintN(64, ci) != ci) return false
  return face(ci) <= NUM_FACES && (lsb(ci) & 0x1555555555555555n) != 0n
}

/**
 * Returns whether this cell ID is at the deepest level; that is, the level at which the cells are smallest.
 */
export const isLeaf = (ci: CellID): boolean => (ci & 1n) != 0n

// Bitwise

/**
 * Returns the least significant bit that is set
 */
const lsb = (ci: CellID) => ci & -ci

/**
 * Returns the lowest-numbered bit that is on for cells at the given level.
 */
const lsbForLevel = (level: number): CellID => {
  return 1n << BigInt(2 * (MAX_LEVEL - level))
}

// Ranges

/**
 * Returns the minimum CellID that is contained within this cell.
 */
export const rangeMin = (ci: CellID) => {
  return ci - (lsb(ci) - 1n)
}

/**
 * Returns the maximum CellID that is contained within this cell.
 */
export const rangeMax = (ci: CellID): CellID => {
  return ci + (lsb(ci) - 1n)
}

/**
 * Returns true iff ci contains oci.
 */
export const contains = (ci: CellID, oci: CellID) => {
  return rangeMin(ci) <= oci && oci <= rangeMax(ci)
}

/**
 * Returns true iff ci intersects oci.
 */
export const intersects = (ci: CellID, oci: CellID) => {
  return rangeMin(oci) <= rangeMax(ci) && rangeMax(oci) >= rangeMin(ci)
}

// Token

/**
 * Returns a hex-encoded string of the uint64 cell id, with leading zeros included but trailing zeros stripped
 */
export const toToken = (ci: CellID): string => {
  const s = ci.toString(16).replace(/0+$/, '')
  if (s.length === 0) return 'X'
  return s
}

/**
 * Returns a cell id given a hex-encoded string.
 * @category Constructors
 */
export const fromToken = (t: string): CellID => {
  if (t.length > 16) return 0n
  let ci = BigInt('0x' + t)
  if (t.length < 16) ci = ci << BigInt(4 * (16 - t.length))
  return ci
}

// Constructors

/**
 * Returns a cell id given its face in the range [0,5], the 61-bit Hilbert curve position pos within that face, and the level in the range [0,MAX_LEVEL].
 * The position in the cell id will be truncated to correspond to the Hilbert curve position at the center of the returned cell.
 * @category Constructors
 */
export const fromFacePosLevel = (face: number, pos: bigint, level: number): CellID => {
  return parent((BigInt(face) << BigInt(POS_BITS)) + (pos || 1n), level)
}

/**
 * Returns the cell corresponding to a given S2 cube face.
 * @category Constructors
 */
export const fromFace = (face: number): CellID => {
  return (BigInt(face) << BigInt(POS_BITS)) + lsbForLevel(0)
}

/**
 * Returns a leaf cell containing point p.
 * Usually there is exactly one such cell, but for points along the edge of a cell, any adjacent cell may be (deterministically) chosen.
 * This is because CellIDs are considered to be closed sets.
 * The returned cell will always contain the given point, i.e.
 *
 * 	CellFromPoint(p).ContainsPoint(p)
 *
 * is always true.
 * @category Constructors
 */
export const fromPoint = (p: Point): CellID => {
  const [f, u, v] = xyzToFaceUV(p.vector)
  const i = stToIJ(uvToST(u))
  const j = stToIJ(uvToST(v))
  return fromFaceIJ(f, i, j)
}

/**
 * Returns the leaf cell containing ll.
 * @category Constructors
 */
export const fromLatLng = (ll: LatLng): CellID => {
  return fromPoint(Point.fromLatLng(ll))
}

// stuv

/** Converts a value in ST coordinates to a value in IJ coordinates. */
export const stToIJ = (s: number): number => {
  return clampInt(MAX_SIZE * s, 0, MAX_SIZE - 1)
}

export const sizeIJ = (level: number): number => {
  return 1 << (MAX_LEVEL - level)
}

/** Returns the edge length of this CellID in (s,t)-space at the given level. */
export const sizeST = (level: number): number => {
  return ijToSTMin(sizeIJ(level))
}

/**
 * Converts the i- or j-index of a leaf cell to the minimum corresponding s- or t-value contained by that cell.
 * The argument must be in the range [0..2**30].
 * i.e. up to one position beyond the normal range of valid leaf cell indices.
 */
export const ijToSTMin = (i: number): number => i / MAX_SIZE

/**
 * Returns the center of this CellID in (u,v)-space.
 * Note that the center of the cell is defined as the point at which it is recursively subdivided into four children; in general, it is not at the midpoint of the (u,v) rectangle covered by the cell.
 */
export const centerUV = (ci: CellID): R2Point => {
  const { si, ti } = faceSiTi(ci)
  return new R2Point(stToUV(siTiToST(si)), stToUV(siTiToST(ti)))
}

/**
 * Returns a leaf cell given its cube face (range 0..5) and IJ coordinates.
 * @category Constructors
 */
export const fromFaceIJ = (f: number, i: number, j: number): CellID => {
  /** Note that this value gets shifted one bit to the left at the end of the function. */
  let n = BigInt(f) << BigInt(POS_BITS - 1)

  /**
   * Alternating faces have opposite Hilbert curve orientations; this
   * is necessary in order for all faces to have a right-handed
   * coordinate system.
   */
  let bits = f & SWAP_MASK

  /**
   * Each iteration maps 4 bits of "i" and "j" into 8 bits of the Hilbert curve position.
   * The lookup table transforms a 10-bit key of the form "iiiijjjjoo" to a 10-bit value of the form "ppppppppoo", where the
   * letters [ijpo] denote bits of "i", "j", Hilbert curve position, and Hilbert curve orientation respectively.
   */
  for (let k = 7; k >= 0; k--) {
    const mask = (1 << LOOKUP_BITS) - 1
    bits += ((i >> (k * LOOKUP_BITS)) & mask) << (LOOKUP_BITS + 2)
    bits += ((j >> (k * LOOKUP_BITS)) & mask) << 2
    bits = lookupPos[bits]
    n |= BigInt(bits >> 2) << BigInt(k * 2 * LOOKUP_BITS)
    bits &= SWAP_MASK | INVERT_MASK
  }

  return n * 2n + 1n
}

export const fromFaceIJWrap = (f: number, i: number, j: number): CellID => {
  // Convert i and j to the coordinates of a leaf cell just beyond the
  // boundary of this face. This prevents 32-bit overflow in the case
  // of finding the neighbors of a face cell.
  i = clampInt(i, -1, MAX_SIZE)
  j = clampInt(j, -1, MAX_SIZE)

  // We want to wrap these coordinates onto the appropriate adjacent face.
  // The easiest way to do this is to convert the (i,j) coordinates to (x,y,z)
  // (which yields a point outside the normal face boundary), and then call
  // xyzToFaceUV to project back onto the correct face.
  //
  // The code below converts (i,j) to (si,ti), and then (si,ti) to (u,v) using
  // the linear projection (u=2*s-1 and v=2*t-1). (The code further below
  // converts back using the inverse projection, s=0.5*(u+1) and t=0.5*(v+1).
  // Any projection would work here, so we use the simplest.) We also clamp
  // the (u,v) coordinates so that the point is barely outside the
  // [-1,1]x[-1,1] face rectangle, since otherwise the reprojection step
  // (which divides by the new z coordinate) might change the other
  // coordinates enough so that we end up in the wrong leaf cell.
  const scale = 1.0 / MAX_SIZE
  const limit = nextAfter(1, 2)
  const u = Math.max(-limit, Math.min(limit, scale * ((i << 1) + 1 - MAX_SIZE)))
  const v = Math.max(-limit, Math.min(limit, scale * ((j << 1) + 1 - MAX_SIZE)))

  // Find the leaf cell coordinates on the adjacent face, and convert
  // them to a cell id at the appropriate level.
  const [newFace, newU, newV] = xyzToFaceUV(faceUVToXYZ(f, u, v))
  return fromFaceIJ(newFace, stToIJ(0.5 * (newU + 1)), stToIJ(0.5 * (newV + 1)))
}

/**
 * @category Constructors
 */
export const fromFaceIJSame = (f: number, i: number, j: number, sameFace: boolean): CellID => {
  if (sameFace) return fromFaceIJ(f, i, j)
  return fromFaceIJWrap(f, i, j)
}

/**
 * Uses the global lookupIJ table to unfiddle the bits of ci.
 */
export const faceIJOrientation = (ci: CellID): { f: number; i: number; j: number; orientation: number } => {
  let f = face(ci)
  let orientation = f & SWAP_MASK
  let nbits = MAX_LEVEL - 7 * LOOKUP_BITS // first iteration

  let i = 0
  let j = 0

  // Each iteration maps 8 bits of the Hilbert curve position into
  // 4 bits of "i" and "j". The lookup table transforms a key of the
  // form "ppppppppoo" to a value of the form "iiiijjjjoo", where the
  // letters [ijpo] represents bits of "i", "j", the Hilbert curve
  // position, and the Hilbert curve orientation respectively.
  //
  // On the first iteration we need to be careful to clear out the bits
  // representing the cube face.
  for (let k = 7; k >= 0; k--) {
    orientation += Number(((ci >> BigInt(k * 2 * LOOKUP_BITS + 1)) & ((1n << BigInt(2 * nbits)) - 1n)) << 2n)
    orientation = lookupIJ[orientation]
    i += (orientation >> (LOOKUP_BITS + 2)) << (k * LOOKUP_BITS)
    j += ((orientation >> 2) & ((1 << LOOKUP_BITS) - 1)) << (k * LOOKUP_BITS)
    orientation &= SWAP_MASK | INVERT_MASK
    nbits = LOOKUP_BITS // following iterations
  }

  // The position of a non-leaf cell at level "n" consists of a prefix of
  // 2*n bits that identifies the cell, followed by a suffix of
  // 2*(MAX_LEVEL-n)+1 bits of the form 10*. If n==MAX_LEVEL, the suffix is
  // just "1" and has no effect. Otherwise, it consists of "10", followed
  // by (MAX_LEVEL-n-1) repetitions of "00", followed by "0". The "10" has
  // no effect, while each occurrence of "00" has the effect of reversing
  // the SWAP_MASK bit.
  if ((lsb(ci) & BigInt('0x1111111111111110')) != 0n) orientation ^= SWAP_MASK

  return { f, i, j, orientation }
}

/**
 * Returns the Face/Si/Ti coordinates of the center of the cell.
 */
export const faceSiTi = (ci: CellID): { face: number; si: number; ti: number } => {
  const { f: face, i, j } = faceIJOrientation(ci)

  let delta = 0
  if (isLeaf(ci)) delta = 1
  else if (((BigInt(i) ^ (ci >> 2n)) & 1n) != 0n) delta = 2

  return { face, si: 2 * i + delta, ti: 2 * j + delta }
}

/**
 * Returns the bounds in (u,v)-space for the cell at the given
 * level containing the leaf cell with the given (i,j)-coordinates.
 */
export const ijLevelToBoundUV = (i: number, j: number, level: number): Rect => {
  let cellSize = sizeIJ(level)
  let xLo = i & -cellSize
  let yLo = j & -cellSize

  return new Rect(
    new Interval(stToUV(ijToSTMin(xLo)), stToUV(ijToSTMin(xLo + cellSize))),
    new Interval(stToUV(ijToSTMin(yLo)), stToUV(ijToSTMin(yLo + cellSize)))
  )
}

/**
 * Returns an unnormalized r3 vector from the origin through the center
 * of the s2 cell on the sphere.
 */
export const rawPoint = (ci: CellID): Vector => {
  const { face, si, ti } = faceSiTi(ci)
  return faceSiTiToXYZ(face, si, ti).vector
}

/**
 * Returns the center of the s2 cell on the sphere as a Point.
 * The maximum directional error in Point (compared to the exact
 * mathematical result) is 1.5 * dblEpsilon radians, and the maximum length
 * error is 2 * dblEpsilon (the same as Normalize).
 */
export const point = (ci: CellID): Point => {
  return Point.fromVector(rawPoint(ci).normalize())
}

/**
 * Returns the center of the s2 cell on the sphere as a LatLng.
 */
export const latLng = (ci: CellID): LatLng => {
  return LatLng.fromPoint(Point.fromVector(rawPoint(ci)))
}

/**
 * Returns the neighboring cellIDs with vertex closest to this cell at the given level.
 * (Normally there are four neighbors, but the closest vertex may only have three neighbors if it is one of
 * the 8 cube vertices.)
 */
export const vertexNeighbors = (ci: CellID, level: number): CellID[] => {
  const halfSize = sizeIJ(level + 1)
  const size = halfSize << 1
  const { f, i, j } = faceIJOrientation(ci)

  var isame = false
  let jsame = false
  let ioffset = 0
  let joffset = 0

  if ((i & halfSize) != 0) {
    ioffset = size
    isame = i + size < MAX_SIZE
  } else {
    ioffset = -size
    isame = i - size >= 0
  }
  if ((j & halfSize) != 0) {
    joffset = size
    jsame = j + size < MAX_SIZE
  } else {
    joffset = -size
    jsame = j - size >= 0
  }
  const results: CellID[] = [
    parent(ci, level),
    parent(fromFaceIJSame(f, i + ioffset, j, isame), level),
    parent(fromFaceIJSame(f, i, j + joffset, jsame), level)
  ]

  if (isame || jsame) {
    results.push(parent(fromFaceIJSame(f, i + ioffset, j + joffset, isame && jsame), level))
  }

  return results
}

/**
 * Returns the first child in a traversal of the children of this cell, in Hilbert curve order.
 *
 * 	for (let ci = c.childBegin(); ci != c.childEnd(); ci = ci.next()) {
 * 	    ...
 * 	}
 */
export const childBegin = (ci: CellID): CellID => {
  const ol = lsb(ci)
  return ci - ol + (ol >> 2n)
}

/**
 * Returns the first cell in a traversal of children a given level deeper than this cell, in
 * Hilbert curve order. The given level must be no smaller than the cell's level.
 * See ChildBegin for example use.
 */
export const childBeginAtLevel = (ci: CellID, level: number): CellID => {
  return ci - lsb(ci) + lsbForLevel(level)
}

/**
 * Returns the first cell after a traversal of the children of this cell in Hilbert curve order.
 * The returned cell may be invalid.
 */
export const childEnd = (ci: CellID): CellID => {
  const ol = lsb(ci)
  return ci + ol + (ol >> 2n)
}

/**
 * Returns the first cell after the last child in a traversal of children a given level deeper
 * than this cell, in Hilbert curve order.
 * The given level must be no smaller than the cell's level.
 * The returned cell may be invalid.
 */
export const childEndAtLevel = (ci: CellID, level: number): CellID => {
  return ci + lsb(ci) + lsbForLevel(level)
}

/**
 * Returns the next cell along the Hilbert curve.
 * This is expected to be used with ChildBegin and ChildEnd,
 * or ChildBeginAtLevel and ChildEndAtLevel.
 */
export const next = (ci: CellID): CellID => {
  return ci + (lsb(ci) << 1n)
}

/** Returns the previous cell along the Hilbert curve. */
export const prev = (ci: CellID): CellID => {
  return ci - (lsb(ci) << 1n)
}
