import type * as geojson from 'geojson'
import { test, describe } from 'node:test'
import { deepEqual } from 'node:assert/strict'
import { RegionCoverer } from './RegionCoverer'
import * as cellid from '../s2/cellid'

describe('RegionCoverer', () => {
  test('polygon - incorrect winding + duplicate adjacent vertices', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-1.599437, 53.803895],
          [-1.598511, 53.803895],
          [-1.595764, 53.803895],
          [-1.593018, 53.803895],
          [-1.593018, 53.802273],
          [-1.590271, 53.802273],
          [-1.587524, 53.802273],
          [-1.585241, 53.802273],
          [-1.584778, 53.802273],
          [-1.582031, 53.802273],
          [-1.582031, 53.801097],
          [-1.582031, 53.800651],
          [-1.579285, 53.800651],
          [-1.576538, 53.800651],
          [-1.576538, 53.799029],
          [-1.576538, 53.797406],
          [-1.577464, 53.797406],
          [-1.577464, 53.797406],
          [-1.581105, 53.797406],
          [-1.581424, 53.795784],
          [-1.584778, 53.795784],
          [-1.584778, 53.794162],
          [-1.584778, 53.794144],
          [-1.587524, 53.792594],
          [-1.587524, 53.790917],
          [-1.587524, 53.790917],
          [-1.592091, 53.790917],
          [-1.592091, 53.790917],
          [-1.593018, 53.790917],
          [-1.593018, 53.792539],
          [-1.595764, 53.792539],
          [-1.596722, 53.794162],
          [-1.596722, 53.794162],
          [-1.595764, 53.795784],
          [-1.595764, 53.797406],
          [-1.595764, 53.799029],
          [-1.595764, 53.800651],
          [-1.598511, 53.800651],
          [-1.599205, 53.801827],
          [-1.599118, 53.802273],
          [-1.599437, 53.803895],
          [-1.599437, 53.803895]
        ]
      ]
    }

    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual(
      [...union.map(cellid.toToken)],
      ['48795eb9', '48795ec4', '48795ed04', '48795ed0c', '48795ed74', '48795edc', '48795ee7c', '48795ee84']
    )
  })

  test('polygon - twisted + contains duplicate vertices', (t) => {
    const mpolygon: geojson.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-122.420357, 37.651333],
            [-122.42047100000001, 37.652073],
            [-122.421204, 37.651173],
            [-122.42038700000001, 37.651276],
            [-122.405418, 37.634312],
            [-122.400352, 37.634029],
            [-122.39450100000001, 37.632862],
            [-122.388313, 37.633675],
            [-122.37602200000001, 37.631088],
            [-122.362549, 37.638908],
            [-122.360283, 37.634068],
            [-122.35611, 37.614025],
            [-122.353706, 37.612396],
            [-122.351601, 37.61134],
            [-122.349411, 37.610287],
            [-122.345123, 37.607704],
            [-122.34137699999999, 37.590256],
            [-122.359131, 37.585941],
            [-122.36784400000001, 37.600216],
            [-122.37653400000001, 37.605061],
            [-122.380539, 37.607029],
            [-122.383797, 37.607666],
            [-122.395447, 37.60276],
            [-122.401848, 37.605137],
            [-122.404831, 37.611164],
            [-122.405632, 37.613293],
            [-122.40589900000001, 37.614941],
            [-122.40582999999999, 37.615002],
            [-122.40129899999999, 37.625465],
            [-122.405418, 37.634312],
            [-122.420357, 37.651333]
          ]
        ]
      ]
    }

    const cov = new RegionCoverer()
    const union = cov.covering(mpolygon)
    deepEqual([...union.map(cellid.toToken)], []) // cannot be fixed, return []
  })

  test('polygon - should not generate global covering', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-77.053846, 38.906842],
          [-77.053847, 38.90684000000001],
          [-77.053849, 38.906836000000006],
          [-77.053846, 38.906842]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual([...union.map(cellid.toToken)], [])
  })

  test('multipolygon - should not generate global covering', (t) => {
    const mpolygon: geojson.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-77.053846, 38.906842],
            [-77.053847, 38.90684000000001],
            [-77.053849, 38.906836000000006],
            [-77.053846, 38.906842]
          ]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(mpolygon)
    deepEqual([...union.map(cellid.toToken)], [])
  })

  test('linestring - should generate covering', (t) => {
    const linestring: geojson.LineString = {
      type: 'LineString',
      coordinates: [
        [-77.053846, 38.906842],
        [-77.053847, 38.90684000000001],
        [-77.053849, 38.906836000000006]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(linestring)
    deepEqual(
      [...union.map(cellid.toToken)],
      [
        '89b7b7b50b756d',
        '89b7b7b50b7571',
        '89b7b7b50b75724',
        '89b7b7b50b757b',
        '89b7b7b50b757c04',
        '89b7b7b50b757f',
        '89b7b7b50b9fd35',
        '89b7b7b50b9fd5'
      ]
    )
  })

  test('polygon - should generate global covering', (t) => {
    const polygon: geojson.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-170, 69],
          [170, 70],
          [170, -70],
          [-170, -70],
          [-170, 69]
        ]
      ]
    }
    const cov = new RegionCoverer()
    const union = cov.covering(polygon)
    deepEqual([...union.map(cellid.toToken)], ['1', '3', '5', '7', '9', 'b'])
  })
})
