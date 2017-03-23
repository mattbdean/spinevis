# SpineVis

[![Travis](https://img.shields.io/travis/thatJavaNerd/spinevis.svg)](https://travis-ci.org/thatJavaNerd/spinevis)
<!-- [![Coveralls](https://img.shields.io/coveralls/thatJavaNerd/spinevis.svg)](https://coveralls.io/github/thatJavaNerd/spinevis) -->

Analyze dendritic activity in the web browser. Requires Node.js v7.0+.

## Getting Started

Getting the website up and running is simple. Make sure to install [jspm](http://jspm.io/) globally (`npm i jspm --global`).

```sh
$ npm install && jspm install
$ grunt build
$ node server.js
```

## Building

spinevis is built with the [Grunt](http://gruntjs.com/) task runner.

### Tasks

***(default)*** — Runs Mocha and Karma

**test** — Same as default

**testCoverage** — Cleans the `build` and `.cache` directories and Mocha tests that don't require a database connection and all Karma. Coverage info can be found in `build/reports/coverage/`

**uploadCoverage** — Merges the coverage results from Mocha and Karma and sends it to Coveralls

**build** — Builds the project

 1. Cleans the build and final distribution folder
 2. Minifies CSS
 3. Runs Pug to generate static templates when available
 4. Copies all website assets to `app/server/public`

**watch** — Watches JS, CSS, and Pug files for changes and rebuilds the necessary components. Useful for developing.

**run:bench** — Runs benchmarks

## Contributing

This project follows the branching model outlined [here](http://nvie.com/posts/a-successful-git-branching-model/).

Before committing:

 1. Make sure all unit tests pass: `grunt test`
 2. Make sure there are no outstanding JSHint issues: `grunt jshint`
