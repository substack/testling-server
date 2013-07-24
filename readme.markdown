# testling-server

Run your browser tests on every commit!

This is the run-it-yourself version of
[testling-ci](https://ci.testling.com).

# instructions

```
$ npm install -g testling-server
$ testling-server --port=4000
```

then from a git repo with testling tests:

```
$ git push http://localhost:4000/substack/node-falafel.git master
```

Right now the tests just run with the `xdg-open` or `open` command on the local
system.

You can query the test results:

```
$ curl http://localhost:4000/substack/node-falafel/status.json
{
  "iexplore": {
    "7.0": true,
    "6.0": true,
    "9.0": true,
    "8.0": true
  },
  "opera": {
    "12.0": true
  },
  "firefox": {
    "10.0": true,
    "15.0": true
  },
  "safari": {
    "5.1": true
  },
  "chrome": {
    "20.0": true
  }
}
```

or there is a [level-query](https://npmjs.org/package/level-query) endpoint you
can query at `http://localhost:4000/data.json`:

```
$ curl -sSgN 'http://localhost:4000/data.json?filter=["type","commit"]&map=repo'
[["substack/node-falafel.git"],
["substack/node-falafel.git"],
["substack/gamma.git"]]
```

# already works

* git endpoint
* running tests in browsers
* storing tests in leveldb

# todo

* project pages
* sync with testling-hosted browsers
