# Deploying and Running

## Prerequisites

Make sure your system has `git` (recommended v1.6.6+) and `curl` (recommended v7.43+) installed.

```sh
$ curl --version
curl 7.47.0 <...>

$ git --version
git version 2.7.4
```

## Dependencies

### Node.js

SpineVis relies on Node 7.6+

```sh
$ node --version
v7.8.0
```

To install Node on a RHEL/CentOS/Fedora machine:

```sh
$ curl --silent --location https://rpm.nodesource.com/setup_7.x | sudo -E bash -
$ sudo yum install nodejs
```

If the administrator prevents the use of executing `bash` with sudo, use this:

```sh
$ curl --silent --location https://rpm.nodesource.com/setup_7.x > setup.sh
$ chmod +x setup.sh
$ sudo ./setup.sh
$ rm setup.sh
$ sudo yum install nodejs
```

For other distributions, see [here](https://nodejs.org/en/download/package-manager/).

### Package Managers and Build Tools

Install [Grunt](https://gruntjs.com/), [Yarn](https://yarnpkg.com/en/), and [JSPM](http://jspm.io/).

```sh
$ sudo npm install grunt-cli yarn jspm@beta --global
```

### Database

SpineVis requires MongoDB v3.2+

```sh
$ mongo --version
MongoDB shell version v3.4.3
...
```

See [here](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/) for help installing.

## Environment setup

Clone the repo:

```sh
$ git clone https://github.com/thatJavaNerd/spinevis.git
$ cd spinevis
```

The `master` branch has only stable builds. To use the bleeding edge, you'll have to checkout the `develop` branch.

```sh
$ git checkout develop
Branch develop set up to track remote branch develop from origin.
Switched to a new branch 'develop'
$ git branch
* develop
  master
```

Install server-side dependencies

```sh
$ yarn install
```

Install client-side dependencies

```sh
$ jspm install
```

## Building

SpineVis uses Grunt for its build process. You can run a Grunt task like this:

```sh
$ grunt <task name>
```

`build` &mdash; gets the website ready to serve (minifies CSS, compiles templates, etc.)

`watch` &mdash; automatically rebuilds templates, CSS, and JS files when changed

`test` &mdash; runs server-side and client-side tests

`jshint` &mdash; lints the project to make sure there are no outstanding syntax or style errors

While developing, use `grunt build watch` to build the server and automatically apply any changes while you work

## Running the Server

Running the server is pretty simple

```sh
$ node server
```

You can specify a port using the `PORT` environmental variable

```sh
$ PORT=8080 node server
```

If you need to run a server on port below 1024, you'll need administrator privileges:

```sh
$ sudo PORT=80 node server
```

> The standard ports are 80 for HTTP traffic and 443 for HTTPS traffic.

By default, the application tries to connect to a database at `mongodb://127.0.0.1:27017`. Changing this is similar changing the port:

```sh
$ MONGO_URI=mongodb://my.custom.host:27017 node server
```

You can also run the server with [nodemon](https://nodemon.io/) to automatically restart when you change a server-side file

```sh
$ nodemon server
```

## Using HTTP/2

SpineVis is capable of leveraging HTTP/2 for faster load speeds. See [here](https://github.com/thatJavaNerd/spinevis/blob/master/docs/http2.md) to get that ready.

To redirect all HTTP/1.1 traffic to HTTP/2 traffic, specify the `HTTPS_REDIRECT_PORT` environmental variable.

```sh
$ sudo PORT=443 HTTPS_REDIRECT_PORT=80 node server
```

This way, if the user makes a request to `http://localhost`, they get automatically redirected to `https://localhost`

```sh
$ curl http://localhost -i
HTTP/1.1 301 Moved Permanently
Location: https://localhost:443/
```
