System.config({
  baseURL: "/scripts",
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "runtime",
      "optimisation.modules.system"
    ]
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  },

  depCache: {
    "src/app.module.js": [
      "angular",
      "./session-vis/session-vis.module.js",
      "./session-list/session-list.module.js"
    ],
    "npm:angular@1.6.2.js": [
      "npm:angular@1.6.2/angular"
    ],
    "src/session-list/session-list.module.js": [
      "angular",
      "../core/core.module.js",
      "./session-list.component.js",
      "../core/util.js",
      "angularjs-datepicker",
      "angularjs-datepicker/dist/angular-datepicker.min.css!"
    ],
    "src/session-vis/session-vis.module.js": [
      "angular",
      "../core/core.module.js",
      "../timeline/timeline.module.js",
      "../volume/volume.module.js",
      "../visual-settings/visual-settings.module.js",
      "../mask-toggles/mask-toggles.module.js",
      "./session-vis.component.js",
      "../core/util.js"
    ],
    "src/session-list/session-list.component.js": [
      "../core/util.js",
      "moment",
      "numeral",
      "lodash"
    ],
    "src/core/core.module.js": [
      "angular",
      "./title.factory.js",
      "./session.service.js"
    ],
    "src/session-vis/session-vis.component.js": [
      "moment",
      "jquery",
      "hughsk/tab64",
      "lodash",
      "colormap",
      "tinycolor2",
      "./events.js",
      "../core/util.js",
      "../core/plotdefaults.js"
    ],
    "npm:moment@2.17.1.js": [
      "npm:moment@2.17.1/moment.js"
    ],
    "npm:lodash@4.17.4.js": [
      "npm:lodash@4.17.4/lodash.js"
    ],
    "src/core/util.js": [
      "moment",
      "moment-duration-format",
      "param-case"
    ],
    "src/core/session.js": [
      "lodash"
    ],
    "npm:numeral@2.0.4.js": [
      "npm:numeral@2.0.4/numeral.js"
    ],
    "src/session-vis/trace-manager.js": [
      "lodash",
      "uuid",
      "./range.js",
      "./downsampler.js",
      "../core/session.js",
      "./relative-time.js"
    ],
    "npm:jquery@3.1.1.js": [
      "npm:jquery@3.1.1/dist/jquery.js"
    ],
    "npm:lodash@4.17.4/lodash.js": [
      "@empty"
    ],
    "npm:moment-duration-format@1.3.0.js": [
      "npm:moment-duration-format@1.3.0/lib/moment-duration-format.js"
    ],
    "src/core/range.js": [
      "lodash"
    ],
    "npm:uuid@3.0.1.js": [
      "npm:uuid@3.0.1/index"
    ],
    "npm:moment-duration-format@1.3.0/lib/moment-duration-format.js": [
      "moment"
    ],
    "npm:uuid@3.0.1/index.js": [
      "./v1",
      "./v4"
    ],
    "npm:uuid@3.0.1/v1.js": [
      "./lib/rng-browser",
      "./lib/bytesToUuid"
    ],
    "npm:uuid@3.0.1/v4.js": [
      "./lib/rng-browser",
      "./lib/bytesToUuid"
    ],
    "github:hughsk/tab64@0.0.1.js": [
      "github:hughsk/tab64@0.0.1/index.js"
    ],
    "github:hughsk/tab64@0.0.1/index.js": [
      "dtype"
    ],
    "src/session-vis/downsampler.js": [
      "lodash",
      "./relative-time.js"
    ],
    "src/session-vis/range.js": [
      "lodash"
    ],
    "npm:dtype@2.0.0.js": [
      "npm:dtype@2.0.0/index"
    ],
    "npm:jquery@3.2.1.js": [
      "npm:jquery@3.2.1/dist/jquery.js"
    ],
    "src/timeline/timeline.module.js": [
      "angular",
      "../core/core.module.js",
      "./downsampler.service.js",
      "./trace-manager.service.js",
      "./timeline.component.js"
    ],
    "src/volume/volume.module.js": [
      "angular",
      "../core/core.module.js",
      "./volume.component.js"
    ],
    "src/timeline/timeline.component.js": [
      "lodash",
      "jquery",
      "watchjs",
      "./markers.js",
      "./relative-time.js",
      "../core/range.js",
      "../core/plotdefaults.js",
      "../session-vis/events.js"
    ],
    "src/volume/volume.component.js": [
      "jquery",
      "hughsk/tab64",
      "lodash",
      "tinycolor2",
      "colormap",
      "lru-cache",
      "ndarray-pack",
      "ndarray-ops",
      "./render-util.js",
      "../core/range.js",
      "../core/plotdefaults.js",
      "../session-vis/events.js",
      "../visual-settings/defaults.js"
    ],
    "src/timeline/trace-manager.js": [
      "lodash",
      "uuid",
      "../core/range.js",
      "./downsampler.js",
      "../core/session.js",
      "./relative-time.js"
    ],
    "src/timeline/range.js": [
      "lodash"
    ],
    "src/timeline/downsampler.js": [
      "lodash",
      "./relative-time.js"
    ],
    "npm:watchjs@0.0.0.js": [
      "npm:watchjs@0.0.0/src/watch.js"
    ],
    "src/volume/render-util.js": [
      "bit-twiddle",
      "typedarray-pool",
      "ndarray",
      "ndarray-fill",
      "ndarray-gradient",
      "ndarray-homography",
      "ndarray-ops",
      "tinycolor2"
    ],
    "npm:bit-twiddle@1.0.2.js": [
      "npm:bit-twiddle@1.0.2/twiddle.js"
    ],
    "npm:ndarray@1.0.18.js": [
      "npm:ndarray@1.0.18/ndarray.js"
    ],
    "npm:typedarray-pool@1.1.0.js": [
      "npm:typedarray-pool@1.1.0/pool.js"
    ],
    "npm:ndarray-fill@1.0.2.js": [
      "npm:ndarray-fill@1.0.2/index.js"
    ],
    "npm:ndarray-gradient@1.0.0.js": [
      "npm:ndarray-gradient@1.0.0/fdg.js"
    ],
    "npm:ndarray-homography@1.0.0.js": [
      "npm:ndarray-homography@1.0.0/xform.js"
    ],
    "npm:ndarray-ops@1.2.2.js": [
      "npm:ndarray-ops@1.2.2/ndarray-ops.js"
    ],
    "npm:tinycolor2@1.4.1.js": [
      "npm:tinycolor2@1.4.1/tinycolor.js"
    ],
    "npm:ndarray@1.0.18/ndarray.js": [
      "iota-array",
      "is-buffer"
    ],
    "npm:typedarray-pool@1.1.0/pool.js": [
      "bit-twiddle",
      "dup",
      "buffer"
    ],
    "npm:ndarray-fill@1.0.2/index.js": [
      "cwise"
    ],
    "npm:ndarray-gradient@1.0.0/fdg.js": [
      "dup",
      "cwise-compiler"
    ],
    "npm:ndarray-homography@1.0.0/xform.js": [
      "ndarray-warp",
      "gl-matrix-invert"
    ],
    "npm:ndarray-ops@1.2.2/ndarray-ops.js": [
      "cwise-compiler"
    ],
    "npm:tinycolor2@1.4.1/tinycolor.js": [
      "process"
    ],
    "npm:iota-array@1.0.0.js": [
      "npm:iota-array@1.0.0/iota.js"
    ],
    "npm:dup@1.0.0.js": [
      "npm:dup@1.0.0/dup.js"
    ],
    "npm:is-buffer@1.1.5.js": [
      "npm:is-buffer@1.1.5/index.js"
    ],
    "github:jspm/nodelibs-buffer@0.1.0.js": [
      "github:jspm/nodelibs-buffer@0.1.0/index"
    ],
    "npm:cwise@1.0.10.js": [
      "npm:cwise@1.0.10/lib/cwise-esprima.js"
    ],
    "npm:cwise-compiler@1.1.2.js": [
      "npm:cwise-compiler@1.1.2/compiler.js"
    ],
    "npm:ndarray-warp@1.0.1.js": [
      "npm:ndarray-warp@1.0.1/warp.js"
    ],
    "npm:gl-matrix-invert@1.0.0.js": [
      "npm:gl-matrix-invert@1.0.0/invert.js"
    ],
    "github:jspm/nodelibs-process@0.1.2.js": [
      "github:jspm/nodelibs-process@0.1.2/index"
    ],
    "npm:cwise-compiler@1.1.2/compiler.js": [
      "./lib/thunk"
    ],
    "npm:is-buffer@1.1.5/index.js": [
      "buffer"
    ],
    "github:jspm/nodelibs-buffer@0.1.0/index.js": [
      "buffer"
    ],
    "npm:cwise@1.0.10/lib/cwise-esprima.js": [
      "cwise-parser",
      "cwise-compiler"
    ],
    "npm:gl-matrix-invert@1.0.0/invert.js": [
      "gl-mat2/invert",
      "gl-mat3/invert",
      "gl-mat4/invert"
    ],
    "npm:ndarray-warp@1.0.1/warp.js": [
      "ndarray-linear-interpolate",
      "cwise"
    ],
    "github:jspm/nodelibs-process@0.1.2/index.js": [
      "process"
    ],
    "npm:cwise-compiler@1.1.2/lib/thunk.js": [
      "./compile"
    ],
    "npm:buffer@3.6.0.js": [
      "npm:buffer@3.6.0/index.js"
    ],
    "npm:cwise-parser@1.0.3.js": [
      "npm:cwise-parser@1.0.3/index.js"
    ],
    "npm:ndarray-linear-interpolate@1.0.0.js": [
      "npm:ndarray-linear-interpolate@1.0.0/interp.js"
    ],
    "npm:process@0.11.9.js": [
      "npm:process@0.11.9/browser.js"
    ],
    "npm:buffer@3.6.0/index.js": [
      "base64-js",
      "ieee754",
      "isarray"
    ],
    "npm:cwise-compiler@1.1.2/lib/compile.js": [
      "uniq",
      "process"
    ],
    "npm:cwise-parser@1.0.3/index.js": [
      "esprima",
      "uniq"
    ],
    "npm:base64-js@0.0.8.js": [
      "npm:base64-js@0.0.8/lib/b64.js"
    ],
    "npm:ieee754@1.1.8.js": [
      "npm:ieee754@1.1.8/index.js"
    ],
    "npm:isarray@1.0.0.js": [
      "npm:isarray@1.0.0/index.js"
    ],
    "npm:uniq@1.0.1.js": [
      "npm:uniq@1.0.1/uniq.js"
    ],
    "npm:esprima@1.1.1.js": [
      "npm:esprima@1.1.1/esprima.js"
    ],
    "npm:esprima@1.1.1/esprima.js": [
      "process"
    ],
    "npm:lru-cache@4.0.2.js": [
      "npm:lru-cache@4.0.2/lib/lru-cache.js"
    ],
    "npm:lru-cache@4.0.2/lib/lru-cache.js": [
      "pseudomap",
      "util",
      "yallist"
    ],
    "npm:yallist@2.1.2.js": [
      "npm:yallist@2.1.2/yallist.js"
    ],
    "npm:pseudomap@1.0.2.js": [
      "npm:pseudomap@1.0.2/map.js"
    ],
    "github:jspm/nodelibs-util@0.1.0.js": [
      "github:jspm/nodelibs-util@0.1.0/index"
    ],
    "npm:pseudomap@1.0.2/map.js": [
      "./pseudomap",
      "process"
    ],
    "github:jspm/nodelibs-util@0.1.0/index.js": [
      "util"
    ],
    "npm:util@0.10.3.js": [
      "npm:util@0.10.3/util.js"
    ],
    "npm:util@0.10.3/util.js": [
      "./support/isBufferBrowser",
      "inherits",
      "process"
    ],
    "npm:inherits@2.0.1.js": [
      "npm:inherits@2.0.1/inherits_browser.js"
    ],
    "npm:angular@1.6.3.js": [
      "npm:angular@1.6.3/angular"
    ],
    "npm:angularjs-slider@6.1.1.js": [
      "npm:angularjs-slider@6.1.1/dist/rzslider.js"
    ],
    "npm:ndarray-pack@1.2.1.js": [
      "npm:ndarray-pack@1.2.1/convert.js"
    ],
    "npm:angularjs-slider@6.1.1/dist/rzslider.js": [
      "angular"
    ],
    "npm:ndarray-pack@1.2.1/convert.js": [
      "ndarray",
      "./doConvert"
    ],
    "npm:ndarray-pack@1.2.1/doConvert.js": [
      "cwise-compiler"
    ],
    "npm:colormap@2.2.0.js": [
      "npm:colormap@2.2.0/index.js"
    ],
    "npm:colormap@2.2.0/index.js": [
      "arraytools",
      "clone",
      "./colorScales"
    ],
    "npm:arraytools@1.1.2.js": [
      "npm:arraytools@1.1.2/index.js"
    ],
    "npm:clone@1.0.2.js": [
      "npm:clone@1.0.2/clone.js"
    ],
    "npm:clone@1.0.2/clone.js": [
      "buffer"
    ],
    "npm:param-case@2.1.1.js": [
      "npm:param-case@2.1.1/param-case.js"
    ],
    "npm:param-case@2.1.1/param-case.js": [
      "no-case"
    ],
    "npm:no-case@2.3.1.js": [
      "npm:no-case@2.3.1/no-case.js"
    ],
    "npm:no-case@2.3.1/no-case.js": [
      "lower-case",
      "./vendor/non-word-regexp",
      "./vendor/camel-case-regexp",
      "./vendor/camel-case-upper-regexp"
    ],
    "npm:lower-case@1.1.4.js": [
      "npm:lower-case@1.1.4/lower-case.js"
    ],
    "src/visual-settings/visual-settings.module.js": [
      "angular",
      "./visual-settings.component.js",
      "../core/util.js",
      "angularjs-slider",
      "angularjs-slider/dist/rzslider.min.css!",
      "angular-ui-bootstrap"
    ],
    "src/visual-settings/visual-settings.component.js": [
      "lodash",
      "../session-vis/events.js",
      "./defaults.js"
    ],
    "src/mask-toggles/mask-toggles.module.js": [
      "angular",
      "../core/core.module.js",
      "./mask-toggles.component.js",
      "angular-bootstrap-toggle",
      "angular-bootstrap-toggle/dist/angular-bootstrap-toggle.min.css!",
      "../core/util.js"
    ],
    "src/mask-toggles/mask-toggles.component.js": [
      "lodash",
      "../session-vis/events.js",
      "tinycolor2"
    ],
    "github:ziscloud/angular-bootstrap-toggle@0.1.2.js": [
      "github:ziscloud/angular-bootstrap-toggle@0.1.2/dist/angular-bootstrap-toggle.min.js"
    ],
    "src/core/session.service.js": [
      "lodash"
    ],
    "src/timeline/downsampler.service.js": [
      "lodash",
      "./relative-time.js"
    ],
    "src/timeline/trace-manager.service.js": [
      "lodash",
      "uuid",
      "../core/range.js",
      "./relative-time.js"
    ],
    "npm:angular-ui-bootstrap@2.5.0.js": [
      "npm:angular-ui-bootstrap@2.5.0/index.js"
    ],
    "npm:angular-ui-bootstrap@2.5.0/index.js": [
      "./dist/ui-bootstrap-tpls"
    ],
    "npm:angularjs-datepicker@2.1.17.js": [
      "npm:angularjs-datepicker@2.1.17/dist/angular-datepicker.min.js"
    ]
  },

  map: {
    "angular": "npm:angular@1.6.3",
    "angular-bootstrap-toggle": "github:ziscloud/angular-bootstrap-toggle@0.1.2",
    "angular-resource": "npm:angular-resource@1.6.2",
    "angular-ui-bootstrap": "npm:angular-ui-bootstrap@2.5.0",
    "angularjs-datepicker": "npm:angularjs-datepicker@2.1.17",
    "angularjs-slider": "npm:angularjs-slider@6.1.1",
    "async": "npm:async@2.2.0",
    "babel": "npm:babel-core@5.8.38",
    "babel-runtime": "npm:babel-runtime@5.8.38",
    "bit-twiddle": "npm:bit-twiddle@1.0.2",
    "bootstrap": "github:twbs/bootstrap@3.3.7",
    "chai": "npm:chai@3.5.0",
    "colormap": "npm:colormap@2.2.0",
    "core-js": "npm:core-js@1.2.7",
    "css": "github:systemjs/plugin-css@0.1.33",
    "dtype": "npm:dtype@2.0.0",
    "hughsk/tab64": "github:hughsk/tab64@0.0.1",
    "jquery": "npm:jquery@3.2.1",
    "lodash": "npm:lodash@4.17.4",
    "lru-cache": "npm:lru-cache@4.0.2",
    "moment": "npm:moment@2.17.1",
    "moment-duration-format": "npm:moment-duration-format@1.3.0",
    "ndarray": "npm:ndarray@1.0.18",
    "ndarray-fill": "npm:ndarray-fill@1.0.2",
    "ndarray-gradient": "npm:ndarray-gradient@1.0.0",
    "ndarray-homography": "npm:ndarray-homography@1.0.0",
    "ndarray-ops": "npm:ndarray-ops@1.2.2",
    "ndarray-pack": "npm:ndarray-pack@1.2.1",
    "numeral": "npm:numeral@2.0.4",
    "param-case": "npm:param-case@2.1.1",
    "tinycolor2": "npm:tinycolor2@1.4.1",
    "typedarray-pool": "npm:typedarray-pool@1.1.0",
    "uuid": "npm:uuid@3.0.1",
    "watchjs": "npm:watchjs@0.0.0",
    "github:jspm/nodelibs-assert@0.1.0": {
      "assert": "npm:assert@1.4.1"
    },
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.6.0"
    },
    "github:jspm/nodelibs-constants@0.1.0": {
      "constants-browserify": "npm:constants-browserify@0.0.1"
    },
    "github:jspm/nodelibs-crypto@0.1.0": {
      "crypto-browserify": "npm:crypto-browserify@3.11.0"
    },
    "github:jspm/nodelibs-events@0.1.1": {
      "events": "npm:events@1.0.2"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.2": {
      "process": "npm:process@0.11.9"
    },
    "github:jspm/nodelibs-stream@0.1.0": {
      "stream-browserify": "npm:stream-browserify@1.0.0"
    },
    "github:jspm/nodelibs-string_decoder@0.1.0": {
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "github:jspm/nodelibs-tty@0.1.0": {
      "tty-browserify": "npm:tty-browserify@0.0.0"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "github:jspm/nodelibs-vm@0.1.0": {
      "vm-browserify": "npm:vm-browserify@0.0.4"
    },
    "github:twbs/bootstrap@3.3.7": {
      "jquery": "npm:jquery@3.2.1"
    },
    "npm:acorn@1.2.2": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0"
    },
    "npm:align-text@0.1.4": {
      "kind-of": "npm:kind-of@3.1.0",
      "longest": "npm:longest@1.0.1",
      "repeat-string": "npm:repeat-string@1.6.1"
    },
    "npm:amdefine@1.0.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "module": "github:jspm/nodelibs-module@0.1.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:angularjs-slider@6.1.1": {
      "angular": "npm:angular@1.6.3",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:asn1.js@4.9.1": {
      "bn.js": "npm:bn.js@4.11.6",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "inherits": "npm:inherits@2.0.1",
      "minimalistic-assert": "npm:minimalistic-assert@1.0.0",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:assert@1.4.1": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "util": "npm:util@0.10.3"
    },
    "npm:async@2.2.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "lodash": "npm:lodash@4.17.4",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:babel-runtime@5.8.38": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:bn.js@4.11.6": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:browserify-aes@1.0.6": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "buffer-xor": "npm:buffer-xor@1.0.3",
      "cipher-base": "npm:cipher-base@1.0.3",
      "create-hash": "npm:create-hash@1.1.2",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "evp_bytestokey": "npm:evp_bytestokey@1.0.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "inherits": "npm:inherits@2.0.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:browserify-cipher@1.0.0": {
      "browserify-aes": "npm:browserify-aes@1.0.6",
      "browserify-des": "npm:browserify-des@1.0.0",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "evp_bytestokey": "npm:evp_bytestokey@1.0.0"
    },
    "npm:browserify-des@1.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "cipher-base": "npm:cipher-base@1.0.3",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "des.js": "npm:des.js@1.0.0",
      "inherits": "npm:inherits@2.0.1"
    },
    "npm:browserify-rsa@4.0.1": {
      "bn.js": "npm:bn.js@4.11.6",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "constants": "github:jspm/nodelibs-constants@0.1.0",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "randombytes": "npm:randombytes@2.0.3"
    },
    "npm:browserify-sign@4.0.0": {
      "bn.js": "npm:bn.js@4.11.6",
      "browserify-rsa": "npm:browserify-rsa@4.0.1",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hash": "npm:create-hash@1.1.2",
      "create-hmac": "npm:create-hmac@1.1.4",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "elliptic": "npm:elliptic@6.4.0",
      "inherits": "npm:inherits@2.0.1",
      "parse-asn1": "npm:parse-asn1@5.0.0",
      "stream": "github:jspm/nodelibs-stream@0.1.0"
    },
    "npm:buffer-xor@1.0.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:buffer@3.6.0": {
      "base64-js": "npm:base64-js@0.0.8",
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "ieee754": "npm:ieee754@1.1.8",
      "isarray": "npm:isarray@1.0.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:center-align@0.1.3": {
      "align-text": "npm:align-text@0.1.4",
      "lazy-cache": "npm:lazy-cache@1.0.4"
    },
    "npm:chai@3.5.0": {
      "assertion-error": "npm:assertion-error@1.0.2",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "deep-eql": "npm:deep-eql@0.1.3",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2",
      "type-detect": "npm:type-detect@1.0.0"
    },
    "npm:cipher-base@1.0.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "inherits": "npm:inherits@2.0.1",
      "stream": "github:jspm/nodelibs-stream@0.1.0",
      "string_decoder": "github:jspm/nodelibs-string_decoder@0.1.0"
    },
    "npm:cliui@2.1.0": {
      "center-align": "npm:center-align@0.1.3",
      "right-align": "npm:right-align@0.1.3",
      "wordwrap": "npm:wordwrap@0.0.2"
    },
    "npm:clone@1.0.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:colormap@2.2.0": {
      "arraytools": "npm:arraytools@1.1.2",
      "clone": "npm:clone@1.0.2"
    },
    "npm:concat-stream@1.4.10": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "inherits": "npm:inherits@2.0.1",
      "readable-stream": "npm:readable-stream@1.1.14",
      "typedarray": "npm:typedarray@0.0.6"
    },
    "npm:constants-browserify@0.0.1": {
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-js@1.2.7": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:core-util-is@1.0.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:create-ecdh@4.0.0": {
      "bn.js": "npm:bn.js@4.11.6",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "elliptic": "npm:elliptic@6.4.0"
    },
    "npm:create-hash@1.1.2": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "cipher-base": "npm:cipher-base@1.0.3",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "inherits": "npm:inherits@2.0.1",
      "ripemd160": "npm:ripemd160@1.0.1",
      "sha.js": "npm:sha.js@2.4.8"
    },
    "npm:create-hmac@1.1.4": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hash": "npm:create-hash@1.1.2",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "inherits": "npm:inherits@2.0.1",
      "stream": "github:jspm/nodelibs-stream@0.1.0"
    },
    "npm:crypto-browserify@3.11.0": {
      "browserify-cipher": "npm:browserify-cipher@1.0.0",
      "browserify-sign": "npm:browserify-sign@4.0.0",
      "create-ecdh": "npm:create-ecdh@4.0.0",
      "create-hash": "npm:create-hash@1.1.2",
      "create-hmac": "npm:create-hmac@1.1.4",
      "diffie-hellman": "npm:diffie-hellman@5.0.2",
      "inherits": "npm:inherits@2.0.1",
      "pbkdf2": "npm:pbkdf2@3.0.9",
      "public-encrypt": "npm:public-encrypt@4.0.0",
      "randombytes": "npm:randombytes@2.0.3"
    },
    "npm:cwise-compiler@1.1.2": {
      "process": "github:jspm/nodelibs-process@0.1.2",
      "uniq": "npm:uniq@1.0.1"
    },
    "npm:cwise-parser@1.0.3": {
      "esprima": "npm:esprima@1.1.1",
      "uniq": "npm:uniq@1.0.1"
    },
    "npm:cwise@1.0.10": {
      "cwise-compiler": "npm:cwise-compiler@1.1.2",
      "cwise-parser": "npm:cwise-parser@1.0.3",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "static-module": "npm:static-module@1.3.1",
      "uglify-js": "npm:uglify-js@2.8.16"
    },
    "npm:deep-eql@0.1.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "type-detect": "npm:type-detect@0.1.1"
    },
    "npm:des.js@1.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "inherits": "npm:inherits@2.0.1",
      "minimalistic-assert": "npm:minimalistic-assert@1.0.0"
    },
    "npm:diffie-hellman@5.0.2": {
      "bn.js": "npm:bn.js@4.11.6",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "miller-rabin": "npm:miller-rabin@4.0.0",
      "randombytes": "npm:randombytes@2.0.3",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:duplexer2@0.0.2": {
      "readable-stream": "npm:readable-stream@1.1.14"
    },
    "npm:elliptic@6.4.0": {
      "bn.js": "npm:bn.js@4.11.6",
      "brorand": "npm:brorand@1.1.0",
      "hash.js": "npm:hash.js@1.0.3",
      "hmac-drbg": "npm:hmac-drbg@1.0.0",
      "inherits": "npm:inherits@2.0.1",
      "minimalistic-assert": "npm:minimalistic-assert@1.0.0",
      "minimalistic-crypto-utils": "npm:minimalistic-crypto-utils@1.0.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:escodegen@0.0.28": {
      "esprima": "npm:esprima@1.0.4",
      "estraverse": "npm:estraverse@1.3.2",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "source-map": "npm:source-map@0.5.6",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:escodegen@1.3.3": {
      "esprima": "npm:esprima@1.1.1",
      "estraverse": "npm:estraverse@1.5.1",
      "esutils": "npm:esutils@1.0.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "source-map": "npm:source-map@0.1.43",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:esprima@1.0.4": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:esprima@1.1.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:evp_bytestokey@1.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hash": "npm:create-hash@1.1.2",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0"
    },
    "npm:falafel@1.2.0": {
      "acorn": "npm:acorn@1.2.2",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "foreach": "npm:foreach@2.0.5",
      "isarray": "npm:isarray@0.0.1",
      "object-keys": "npm:object-keys@1.0.11"
    },
    "npm:gl-matrix-invert@1.0.0": {
      "gl-mat2": "npm:gl-mat2@1.0.0",
      "gl-mat3": "npm:gl-mat3@1.0.0",
      "gl-mat4": "npm:gl-mat4@1.1.4"
    },
    "npm:has@1.0.1": {
      "function-bind": "npm:function-bind@1.1.0"
    },
    "npm:hash.js@1.0.3": {
      "inherits": "npm:inherits@2.0.1"
    },
    "npm:hmac-drbg@1.0.0": {
      "hash.js": "npm:hash.js@1.0.3",
      "minimalistic-assert": "npm:minimalistic-assert@1.0.0",
      "minimalistic-crypto-utils": "npm:minimalistic-crypto-utils@1.0.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:is-buffer@1.1.5": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:kind-of@3.1.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "is-buffer": "npm:is-buffer@1.1.5"
    },
    "npm:lazy-cache@1.0.4": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:lru-cache@4.0.2": {
      "pseudomap": "npm:pseudomap@1.0.2",
      "util": "github:jspm/nodelibs-util@0.1.0",
      "yallist": "npm:yallist@2.1.2"
    },
    "npm:miller-rabin@4.0.0": {
      "bn.js": "npm:bn.js@4.11.6",
      "brorand": "npm:brorand@1.1.0"
    },
    "npm:ndarray-fill@1.0.2": {
      "cwise": "npm:cwise@1.0.10"
    },
    "npm:ndarray-gradient@1.0.0": {
      "cwise-compiler": "npm:cwise-compiler@1.1.2",
      "dup": "npm:dup@1.0.0"
    },
    "npm:ndarray-homography@1.0.0": {
      "gl-matrix-invert": "npm:gl-matrix-invert@1.0.0",
      "ndarray-warp": "npm:ndarray-warp@1.0.1"
    },
    "npm:ndarray-ops@1.2.2": {
      "cwise-compiler": "npm:cwise-compiler@1.1.2"
    },
    "npm:ndarray-pack@1.2.1": {
      "cwise-compiler": "npm:cwise-compiler@1.1.2",
      "ndarray": "npm:ndarray@1.0.18"
    },
    "npm:ndarray-warp@1.0.1": {
      "cwise": "npm:cwise@1.0.10",
      "ndarray-linear-interpolate": "npm:ndarray-linear-interpolate@1.0.0"
    },
    "npm:ndarray@1.0.18": {
      "iota-array": "npm:iota-array@1.0.0",
      "is-buffer": "npm:is-buffer@1.1.5"
    },
    "npm:no-case@2.3.1": {
      "lower-case": "npm:lower-case@1.1.4"
    },
    "npm:numeral@2.0.4": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:param-case@2.1.1": {
      "no-case": "npm:no-case@2.3.1"
    },
    "npm:parse-asn1@5.0.0": {
      "asn1.js": "npm:asn1.js@4.9.1",
      "browserify-aes": "npm:browserify-aes@1.0.6",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hash": "npm:create-hash@1.1.2",
      "evp_bytestokey": "npm:evp_bytestokey@1.0.0",
      "pbkdf2": "npm:pbkdf2@3.0.9",
      "systemjs-json": "github:systemjs/plugin-json@0.1.2"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:pbkdf2@3.0.9": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hmac": "npm:create-hmac@1.1.4",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:process@0.11.9": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "vm": "github:jspm/nodelibs-vm@0.1.0"
    },
    "npm:pseudomap@1.0.2": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:public-encrypt@4.0.0": {
      "bn.js": "npm:bn.js@4.11.6",
      "browserify-rsa": "npm:browserify-rsa@4.0.1",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "create-hash": "npm:create-hash@1.1.2",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "parse-asn1": "npm:parse-asn1@5.0.0",
      "randombytes": "npm:randombytes@2.0.3"
    },
    "npm:quote-stream@0.0.0": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "minimist": "npm:minimist@0.0.8",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "through2": "npm:through2@0.4.2"
    },
    "npm:randombytes@2.0.3": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "crypto": "github:jspm/nodelibs-crypto@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:readable-stream@1.0.34": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@0.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream-browserify": "npm:stream-browserify@1.0.0",
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "npm:readable-stream@1.1.14": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "core-util-is": "npm:core-util-is@1.0.2",
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "isarray": "npm:isarray@0.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "stream-browserify": "npm:stream-browserify@1.0.0",
      "string_decoder": "npm:string_decoder@0.10.31"
    },
    "npm:right-align@0.1.3": {
      "align-text": "npm:align-text@0.1.4"
    },
    "npm:ripemd160@1.0.1": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:sha.js@2.4.8": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:source-map@0.1.43": {
      "amdefine": "npm:amdefine@1.0.1",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:source-map@0.5.6": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:static-eval@0.2.4": {
      "escodegen": "npm:escodegen@0.0.28"
    },
    "npm:static-module@1.3.1": {
      "concat-stream": "npm:concat-stream@1.4.10",
      "duplexer2": "npm:duplexer2@0.0.2",
      "escodegen": "npm:escodegen@1.3.3",
      "falafel": "npm:falafel@1.2.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "has": "npm:has@1.0.1",
      "object-inspect": "npm:object-inspect@0.4.0",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "quote-stream": "npm:quote-stream@0.0.0",
      "readable-stream": "npm:readable-stream@1.0.34",
      "shallow-copy": "npm:shallow-copy@0.0.1",
      "static-eval": "npm:static-eval@0.2.4",
      "through2": "npm:through2@0.4.2"
    },
    "npm:stream-browserify@1.0.0": {
      "events": "github:jspm/nodelibs-events@0.1.1",
      "inherits": "npm:inherits@2.0.1",
      "readable-stream": "npm:readable-stream@1.1.14"
    },
    "npm:string_decoder@0.10.31": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0"
    },
    "npm:through2@0.4.2": {
      "readable-stream": "npm:readable-stream@1.0.34",
      "util": "github:jspm/nodelibs-util@0.1.0",
      "xtend": "npm:xtend@2.1.2"
    },
    "npm:tinycolor2@1.4.1": {
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:typedarray-pool@1.1.0": {
      "bit-twiddle": "npm:bit-twiddle@1.0.2",
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "dup": "npm:dup@1.0.0"
    },
    "npm:uglify-js@2.8.16": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "source-map": "npm:source-map@0.5.6",
      "uglify-to-browserify": "npm:uglify-to-browserify@1.0.2",
      "yargs": "npm:yargs@3.10.0"
    },
    "npm:uglify-to-browserify@1.0.2": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "stream": "github:jspm/nodelibs-stream@0.1.0"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.2"
    },
    "npm:uuid@3.0.1": {
      "crypto": "github:jspm/nodelibs-crypto@0.1.0"
    },
    "npm:vm-browserify@0.0.4": {
      "indexof": "npm:indexof@0.0.1"
    },
    "npm:window-size@0.1.0": {
      "process": "github:jspm/nodelibs-process@0.1.2",
      "tty": "github:jspm/nodelibs-tty@0.1.0"
    },
    "npm:xtend@2.1.2": {
      "object-keys": "npm:object-keys@0.4.0"
    },
    "npm:yargs@3.10.0": {
      "assert": "github:jspm/nodelibs-assert@0.1.0",
      "camelcase": "npm:camelcase@1.2.1",
      "cliui": "npm:cliui@2.1.0",
      "decamelize": "npm:decamelize@1.2.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.2",
      "window-size": "npm:window-size@0.1.0"
    }
  }
});
