// The following code is Licensed MIT as it is derived from: https://github.com/Turfjs/turf
// The MIT License (MIT)

// Copyright (c) 2019 Morgan Herlocker

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import type { Feature, Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, Position } from 'geojson'

/**
 * Unwrap coordinates from a Feature, Geometry Object or an Array
 *
 * @name getCoords
 * @param {Array<any>|Geometry|Feature} coords Feature, Geometry Object or an Array
 * @returns {Array<any>} coordinates
 * @example
 * var poly = turf.polygon([[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]);
 *
 * var coords = turf.getCoords(poly);
 * //= [[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]
 */
export const getCoords = <G extends Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon>(
  coords: any[] | Feature<G> | G
): any[] => {
  if (Array.isArray(coords)) {
    return coords
  }

  // Feature
  if (coords.type === 'Feature') {
    if (coords.geometry !== null) {
      return coords.geometry.coordinates
    }
  } else {
    // Geometry
    if (coords.coordinates) {
      return coords.coordinates
    }
  }

  throw new Error('coords must be GeoJSON Feature, Geometry Object or an Array')
}

/**
 * Takes a ring and return true or false whether or not the ring is clockwise or counter-clockwise.
 *
 * @name booleanClockwise
 * @param {Feature<LineString>|LineString|Array<Array<number>>} line to be evaluated
 * @returns {boolean} true/false
 * @example
 * var clockwiseRing = turf.lineString([[0,0],[1,1],[1,0],[0,0]]);
 * var counterClockwiseRing = turf.lineString([[0,0],[1,0],[1,1],[0,0]]);
 *
 * turf.booleanClockwise(clockwiseRing)
 * //=true
 * turf.booleanClockwise(counterClockwiseRing)
 * //=false
 */
export const booleanClockwise = (line: Feature<LineString> | LineString | Position[]): boolean => {
  const ring = getCoords(line)
  let sum = 0
  let i = 1
  let prev
  let cur

  while (i < ring.length) {
    prev = cur || ring[0]
    cur = ring[i]
    sum += (cur[0] - prev[0]) * (cur[1] + prev[1])
    i++
  }
  return sum > 0
}

/**
 * Rewind LineString - outer ring clockwise
 *
 * @private
 * @param {Array<Array<number>>} coords GeoJSON LineString geometry coordinates
 * @param {Boolean} [reverse=false] enable reverse winding
 * @returns {void} mutates coordinates
 */
export const rewindLineString = (coords: Position[], reverse: boolean) => {
  if (booleanClockwise(coords) === reverse) coords.reverse()
}

/**
 * Rewind Polygon - outer ring counterclockwise and inner rings clockwise.
 *
 * @private
 * @param {Array<Array<Array<number>>>} coords GeoJSON Polygon geometry coordinates
 * @param {Boolean} [reverse=false] enable reverse winding
 * @returns {void} mutates coordinates
 */
export const rewindPolygon = (coords: Position[][], reverse: boolean) => {
  // outer ring
  if (booleanClockwise(coords[0]) !== reverse) {
    coords[0].reverse()
  }
  // inner rings
  for (let i = 1; i < coords.length; i++) {
    if (booleanClockwise(coords[i]) === reverse) {
      coords[i].reverse()
    }
  }
}
