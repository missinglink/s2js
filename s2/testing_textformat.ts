import { LatLng } from './LatLng'
import { Point } from './Point'
import { Polyline } from './Polyline'

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
