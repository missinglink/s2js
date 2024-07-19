# s2js

s2js is a Javascript port of the s2 spherical geometry library originally written in C++ at Google.

| [github](https://github.com/missinglink/s2js) | [npm](https://www.npmjs.com/package/s2js) | [documentation](https://missinglink.github.io/s2js) |

### Installation

```bash
npm install s2js
```

### Usage

The library is available as both ESM & CJS modules:

###### ESM

```js
import { s2 } from 's2js'
```

###### CJS

```js
const { s2 } = require('s2js')
```

###### CDN

```html
<script type="module">
  import { s2 } from 'https://esm.sh/s2js/dist/index.js'
</script>
```

### Completeness

The C++ library is quite large, I'm slowly chipping away at it one struct at a time.

I would like to have `s2.RegionCoverer` working from the browser, I'd then like to add conversion functions for `GeoJSON`.

If you'd like to contribute a module please open an Issue to discuss.

### Copyright

© 2024 Peter Johnson &lt;github:missinglink&gt;

This source code is published under the AGPL-3.0 license.
