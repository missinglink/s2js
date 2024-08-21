/**
 * Module s2 is a library for working with geometry in S² (spherical geometry).
 * 
 * Its related modules, parallel to this one, are s1 (operates on S¹), r1 (operates on ℝ¹),
 * r2 (operates on ℝ²) and r3 (operates on ℝ³).

 * This package provides types and functions for the S2 cell hierarchy and coordinate systems.
 * The S2 cell hierarchy is a hierarchical decomposition of the surface of a unit sphere (S²) into “cells”; it is highly efficient, scales from continental size to under 1 cm² and preserves spatial locality (nearby cells have close IDs).
 * 
 * More information including an in-depth introduction to S2 can be found on the S2 website https://s2geometry.io/
 * @module s2
 */
export * as cellid from './cellid'
export { Cap } from './Cap'
export { Cell } from './Cell'
export { CellUnion } from './CellUnion'
// export { ContainsPointQuery } from './ContainsPointQuery'
// export { ContainsVertexQuery } from './ContainsVertexQuery'
// export { CrossingEdgeQuery } from './CrossingEdgeQuery'
// export { EdgeCrosser } from './EdgeCrosser'
// export { EdgeVectorShape } from './EdgeVectorShape'
export { LatLng } from './LatLng'
// export { LaxLoop } from './LaxLoop'
// export { LaxPolygon } from './LaxPolygon'
// export { LaxPolyline } from './LaxPolyline'
export { Loop } from './Loop'
// export { Matrix3x3 } from './matrix3x3'
// export { Metric } from './Metric'
// export { PaddedCell } from './PaddedCell'
export { Point } from './Point'
// export { PointVector } from './PointVector'
export { Polyline } from './Polyline'
export { Rect } from './Rect'
// export { RectBounder } from './RectBounder'
export { Region } from './Region'
export { RegionCoverer, RegionCovererOptions, Coverer } from './RegionCoverer'
// export { Shape, Edge } from './Shape'
export { ShapeIndex } from './ShapeIndex'
// export { ShapeIndexCell } from './ShapeIndexCell'
// export { ShapeIndexClippedShape } from './ShapeIndexClippedShape'
// export { ShapeIndexIterator } from './ShapeIndexIterator'
// export { ShapeIndexRegion } from './ShapeIndexRegion'
// export { ShapeIndexTracker } from './ShapeIndexTracker'
