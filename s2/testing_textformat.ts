import { LatLng } from './LatLng'
import { LaxPolygon } from './LaxPolygon'
import { LaxPolyline } from './LaxPolyline'
import { Loop } from './Loop'
import { Point } from './Point'
import { PointVector } from './PointVector'
import { Polygon } from './Polygon'
import { Polyline } from './Polyline'
import { ShapeIndex } from './ShapeIndex'

export const parsePoints = (str: string): Point[] => {
  return str
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((chunk) => {
      const [x, y] = chunk.split(':').map(parseFloat)
      return Point.fromLatLng(LatLng.fromDegrees(x, y))
    })
}

export const parsePoint = (str: string): Point => {
  const points = parsePoints(str)
  return points.length > 0 ? points[0] : new Point(0, 0, 0)
}

export const makePolyline = (str: string): Polyline => {
  return new Polyline(parsePoints(str))
}

export const makeLaxPolyline = (str: string): LaxPolyline => {
  return new LaxPolyline(parsePoints(str))
}

export const makeLaxPolygon = (str: string): LaxPolygon => {
  if (str == '') return LaxPolygon.fromPoints([])

  var points: Point[][] = str
    .split(';')
    .filter((l) => l !== 'empty')
    .map((l) => (l === 'full' ? [] : parsePoints(l)))

  return LaxPolygon.fromPoints(points)
}

// makeShapeIndex builds a ShapeIndex from the given debug string containing
// the points, polylines, and loops (in the form of a single polygon)
// described by the following format:
//
//	point1|point2|... # line1|line2|... # polygon1|polygon2|...
//
// Examples:
//
//	1:2 | 2:3 # #                     // Two points
//	# 0:0, 1:1, 2:2 | 3:3, 4:4 #      // Two polylines
//	# # 0:0, 0:3, 3:0; 1:1, 2:1, 1:2  // Two nested loops (one polygon)
//	5:5 # 6:6, 7:7 # 0:0, 0:1, 1:0    // One of each
//	# # empty                         // One empty polygon
//	# # empty | full                  // One empty polygon, one full polygon
//
// Loops should be directed so that the region's interior is on the left.
// Loops can be degenerate (they do not need to meet Loop requirements).
//
// Note: Because whitespace is ignored, empty polygons must be specified
// as the string "empty" rather than as the empty string ("").
export const makeShapeIndex = (str: string): ShapeIndex => {
  const fields = str.split('#').map((s) => s.trim())
  if (fields.length != 3) {
    throw new Error("shapeIndex debug string must contain 2 '#' characters")
  }

  const index = new ShapeIndex()

  if (fields[0].length) {
    const points: Point[] = fields[0]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(parsePoint)
    if (points.length) index.add(new PointVector(points))
  }

  if (fields[1].length) {
    const lines: LaxPolyline[] = fields[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(makeLaxPolyline)
    lines.forEach((line) => index.add(line))
  }

  if (fields[2].length) {
    const polygons: LaxPolygon[] = fields[2]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(makeLaxPolygon)
    polygons.forEach((poly) => index.add(poly))
  }

  return index
}

/**
 * Constructs a Loop from the input string.
 * The strings "empty" or "full" create an empty or full loop respectively.
 */
export const makeLoop = (s: string): Loop => {
  if (s === 'full') return Loop.fullLoop()
  if (s === 'empty') return Loop.emptyLoop()

  return new Loop(parsePoints(s))
}

/**
 * Constructs a polygon from the sequence of loops in the input string. Loops are automatically normalized by inverting them if necessary
 * so that they enclose at most half of the unit sphere. (Historically this was
 * once a requirement of polygon loops. It also hides the problem that if the
 * user thinks of the coordinates as X:Y rather than LAT:LNG, it yields a loop
 * with the opposite orientation.)
 *
 * Loops are semicolon separated in the input string with each loop using the
 * same format as above.
 *
 * Examples of the input format:
 *
 * "10:20, 90:0, 20:30"                                  // one loop
 * "10:20, 90:0, 20:30; 5.5:6.5, -90:-180, -15.2:20.3"   // two loops
 * ""       // the empty polygon (consisting of no loops)
 * "empty"  // the empty polygon (consisting of no loops)
 * "full"   // the full polygon (consisting of one full loop)
 */
export const makePolygon = (s: string, normalize: boolean): Polygon => {
  const loops: Loop[] = []

  // Avoid the case where split on empty string will still return
  // one empty value, where we want no values.
  if (s === 'empty' || s === '') {
    return new Polygon(loops)
  }

  s.split(';')
    .map((str) => str.trim())
    .filter(Boolean)
    .forEach((str) => {
      const loop = makeLoop(str)
      if (normalize && !loop.isFull()) loop.normalize()
      loops.push(loop)
    })

  return new Polygon(loops)
}
