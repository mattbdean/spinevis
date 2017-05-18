# SpineVis

[![Travis](https://img.shields.io/travis/thatJavaNerd/spinevis.svg)](https://travis-ci.org/thatJavaNerd/spinevis)
[![Known Vulnerabilities](https://snyk.io/test/github/thatjavanerd/spinevis/badge.svg)](https://snyk.io/test/github/thatjavanerd/spinevis)
[![GitHub tag](https://img.shields.io/github/tag/thatJavaNerd/spinevis.svg)](https://github.com/thatJavaNerd/spinevis/tags)
<!-- [![Coveralls](https://img.shields.io/coveralls/thatJavaNerd/spinevis.svg)](https://coveralls.io/github/thatJavaNerd/spinevis) -->

Analyze dendritic activity in the web browser. Requires Node.js v7.6+.

## Getting Started

Getting the website up and running is simple. Make sure to install [jspm](http://jspm.io/) globally (`npm i jspm --global`).

```sh
$ yarn install && yarn build
$ node server.js
```

## Running

You can start the server using the `server.js` file:

```sh
$ ./server.js [--no-http2]
```

To enable HTTP/2, see [here](https://github.com/thatJavaNerd/spinevis/blob/master/docs/http2.md).

## Building

See [here](https://github.com/thatJavaNerd/spinevis/blob/master/docs/deploying.md#building)

## Contributing

This project follows the branching model outlined [here](http://nvie.com/posts/a-successful-git-branching-model/).

Before committing:

 1. Make sure all unit tests pass: `grunt test`
 2. Make sure there are no outstanding JSHint issues: `grunt jshint`
