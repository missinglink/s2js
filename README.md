# s2js

s2js is a Javascript port of the s2 spherical geometry library.

| [github](https://github.com/missinglink/s2js) | [npm](https://www.npmjs.com/package/s2js) | [documentation](https://missinglink.github.io/s2js) | [demo](https://bdon.github.io/s2js-demos/) |

### Installation

```bash
npm install s2js
```

### Usage

The library is available as both ESM & CJS modules:

**ESM**

```js
import { s2 } from 's2js'
```

**CJS**

```js
const { s2 } = require('s2js')
```

**CDN**

```html
<script type="module">
  import { s2 } from 'https://esm.sh/s2js'
</script>
```

### GeoJSON support

The supplementary `geojson` module provides convenience functions for working with GeoJSON data in S2:

```js
import { geojson } from 's2js'

const s2Polyline = geojson.fromGeoJSON({
  type: 'LineString',
  coordinates: [
    [102.0, 0.0],
    [103.0, 1.0],
    [104.0, 0.0],
    [105.0, 1.0]
  ]
})
```

The `RegionCoverer` supports all geometry types including multi-geometries:

```js
const coverer = new geojson.RegionCoverer({ maxCells: 30 })

const union = coverer.covering({
  type: 'Polygon',
  coordinates: [
    [
      [100.0, 0.0],
      [101.0, 0.0],
      [101.0, 1.0],
      [100.0, 1.0],
      [100.0, 0.0]
    ]
  ]
})
```

### Contributing

If you'd like to contribute a module please open an Issue to discuss.

### Copyright

© 2024 Peter Johnson &lt;github:missinglink&gt;

This source code is published under the Apache-2.0 license.
