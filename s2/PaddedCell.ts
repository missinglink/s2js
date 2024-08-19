import type { CellID } from './cellid'
import { Rect as R2Rect } from '../r2/Rect'
import { Interval as R1Interval } from '../r1/Interval'
import * as cellid from './cellid'
import { ijToPos, INVERT_MASK, posToIJ, posToOrientation, SWAP_MASK } from './lookupIJ'
import { Point } from './Point'
import { faceSiTiToXYZ, siTiToST, stToUV, uvToST } from './stuv'
import { DBL_EPSILON } from './predicates'
import { findMSBSetNonZero64 } from '../r1/math'
import { MAX_LEVEL } from './cellid_constants'

export class PaddedCell {
  id: CellID = 0n
  padding: number = 0
  bound: R2Rect = R2Rect.empty()
  middle: R2Rect = R2Rect.empty() // A rect in (u, v)-space that belongs to all four children.
  iLo: number = 0 // Minimum (i,j)-coordinates of this cell before padding
  jLo: number = 0
  orientation: number = 0 // Hilbert curve orientation of this cell.
  level: number = 0

  // Constructs a padded cell with the given padding.
  static fromCellID(id: CellID, padding: number): PaddedCell {
    const p = new PaddedCell()
    p.id = id
    p.padding = padding
    p.middle = R2Rect.empty()

    // Fast path for constructing a top-level face (the most common case).
    if (cellid.isFace(id)) {
      const limit = padding + 1
      p.bound = new R2Rect(new R1Interval(-limit, limit), new R1Interval(-limit, limit))
      p.middle = new R2Rect(new R1Interval(-padding, padding), new R1Interval(-padding, padding))
      p.orientation = cellid.face(id) & 1
      return p
    }

    const { i, j, orientation } = cellid.faceIJOrientation(id)
    p.iLo = i
    p.jLo = j
    p.orientation = orientation
    p.level = cellid.level(id)
    p.bound = cellid.ijLevelToBoundUV(i, j, p.level).expandedByMargin(padding)
    const ijSize = cellid.sizeIJ(p.level)
    p.iLo &= -ijSize
    p.jLo &= -ijSize

    return p
  }

  // Constructs the child of parent with the given (i,j) index.
  static fromParentIJ(parent: PaddedCell, i: number, j: number): PaddedCell {
    const pos = ijToPos[parent.orientation][2 * i + j]

    const p = new PaddedCell()
    p.id = cellid.children(parent.id)[pos]
    p.padding = parent.padding
    p.bound = R2Rect.fromRect(parent.bound)
    p.orientation = parent.orientation ^ posToOrientation[pos]
    p.level = parent.level + 1
    p.middle = R2Rect.empty()

    const ijSize = cellid.sizeIJ(p.level)
    p.iLo = parent.iLo + i * ijSize
    p.jLo = parent.jLo + j * ijSize

    const middle = parent.middleRect()
    if (i === 1) {
      p.bound.x.lo = middle.x.lo
    } else {
      p.bound.x.hi = middle.x.hi
    }
    if (j === 1) {
      p.bound.y.lo = middle.y.lo
    } else {
      p.bound.y.hi = middle.y.hi
    }

    return p
  }

  // Returns the CellID this padded cell represents.
  cellID(): CellID {
    return this.id
  }

  // Returns the amount of padding on this cell.
  paddingValue(): number {
    return this.padding
  }

  // Returns the level this cell is at.
  levelValue(): number {
    return this.level
  }

  // Returns the center of this cell.
  center(): Point {
    const ijSize = cellid.sizeIJ(this.level)
    const si = 2 * this.iLo + ijSize
    const ti = 2 * this.jLo + ijSize
    return Point.fromVector(faceSiTiToXYZ(cellid.face(this.id), si, ti).vector.normalize())
  }

  // Returns the rectangle in the middle of this cell that belongs to all four of its children in (u,v)-space.
  middleRect(): R2Rect {
    if (this.middle.isEmpty()) {
      const ijSize = cellid.sizeIJ(this.level)
      const u = stToUV(siTiToST(2 * this.iLo + ijSize))
      const v = stToUV(siTiToST(2 * this.jLo + ijSize))
      this.middle = new R2Rect(
        new R1Interval(u - this.padding, u + this.padding),
        new R1Interval(v - this.padding, v + this.padding)
      )
    }
    return this.middle
  }

  // Returns the bounds for this cell in (u,v)-space including padding.
  boundRect(): R2Rect {
    return this.bound
  }

  // Returns the (i,j) coordinates for the child cell at the given traversal position.
  childIJ(pos: number): [number, number] {
    const ij = posToIJ[this.orientation][pos]
    return [ij >> 1, ij & 1]
  }

  // Returns the vertex where the space-filling curve enters this cell.
  entryVertex(): Point {
    let i = this.iLo
    let j = this.jLo
    if (this.orientation & INVERT_MASK) {
      const ijSize = cellid.sizeIJ(this.level)
      i += ijSize
      j += ijSize
    }
    return Point.fromVector(faceSiTiToXYZ(cellid.face(this.id), 2 * i, 2 * j).vector.normalize())
  }

  // Returns the vertex where the space-filling curve exits this cell.
  exitVertex(): Point {
    let i = this.iLo
    let j = this.jLo
    const ijSize = cellid.sizeIJ(this.level)
    if (this.orientation === 0 || this.orientation === SWAP_MASK + INVERT_MASK) {
      i += ijSize
    } else {
      j += ijSize
    }
    return Point.fromVector(faceSiTiToXYZ(cellid.face(this.id), 2 * i, 2 * j).vector.normalize())
  }

  // Returns the smallest CellID that contains all descendants of this padded cell whose bounds intersect the given rect.
  shrinkToFit(rect: R2Rect): CellID {
    if (this.level === 0) {
      if (rect.x.contains(0) || rect.y.contains(0)) return this.id
    }

    const ijSize = cellid.sizeIJ(this.level)
    if (
      rect.x.contains(stToUV(siTiToST(2 * this.iLo + ijSize))) ||
      rect.y.contains(stToUV(siTiToST(2 * this.jLo + ijSize)))
    ) {
      return this.id
    }

    const padded = rect.expandedByMargin(this.padding + 1.5 * DBL_EPSILON)
    let iMin = this.iLo
    let jMin = this.jLo
    let iXor = 0
    let jXor = 0

    if (iMin < cellid.stToIJ(uvToST(padded.x.lo))) {
      iMin = cellid.stToIJ(uvToST(padded.x.lo))
    }
    if (this.iLo + ijSize - 1 <= cellid.stToIJ(uvToST(padded.x.hi))) {
      iXor = iMin ^ (this.iLo + ijSize - 1)
    } else {
      iXor = iMin ^ cellid.stToIJ(uvToST(padded.x.hi))
    }

    if (jMin < cellid.stToIJ(uvToST(padded.y.lo))) {
      jMin = cellid.stToIJ(uvToST(padded.y.lo))
    }
    if (this.jLo + ijSize - 1 <= cellid.stToIJ(uvToST(padded.y.hi))) {
      jXor = jMin ^ (this.jLo + ijSize - 1)
    } else {
      jXor = jMin ^ cellid.stToIJ(uvToST(padded.y.hi))
    }

    const levelMSB = BigInt((iXor | jXor) << 1) + 1n
    const level = MAX_LEVEL - findMSBSetNonZero64(levelMSB)
    if (level <= this.level) return this.id

    return cellid.parent(cellid.fromFaceIJ(cellid.face(this.id), iMin, jMin), level)
  }
}
