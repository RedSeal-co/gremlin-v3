gremlin-v3
============

[![Build Status](https://travis-ci.org/jimlloyd/gremlin-v3.svg)](https://travis-ci.org/jimlloyd/gremlin-v3)

**NOTE: This project is no longer being maintained. The project owners instead now use [ts-tinkerpop](https://github.com/RedSeal-co/ts-tinkerpop),
which takes advantage of [ts-java](https://github.com/RedSeal-co/ts-java). We suggest you take a look at those two
projects.**

Implementation of [Gremlin/TinkerPop3](https://github.com/tinkerpop/tinkerpop3) for node.js. Gremlin-v3 is a javascript wrapper around the TinkerPop3 API. The node-java module provides the bridge between node and Java.

**NOTE: This package is compatible with TinkerPop3. For TinkerPop2 compatibility, see the upstream repository [gremlin-node](https://github.com/inolen/gremlin-node).**

```javascript
var Gremlin = require('gremlin');
var gremlin = new Gremlin({
  classpath: [ ... ],
  options: [ ... ]
});

var TinkerGraphFactory = gremlin.java.import('com.tinkerpop.gremlin.tinkergraph.structure.TinkerFactory');
var graph = TinkerGraphFactory.createClassicSync();
var g = gremlin.wrap(graph);

g.V('name', 'marko').next(function (err, v) {
  v.value('name', function (err, value) {
    console.log(value);
  });
});
```

## Promises/A+ API

Gremlin-v3 supports the use of Promises/A+ for most functions taking a callback. For example, a portion of the above code could be written as:

```javascript
g.V('name', 'marko').next().then(
  function (v) {
    v.value('name').then(console.log);
  });
```

This snippet by itself may seem underwhelming, but consider that with some enhanecments to the gremlin-console application, promises make it possible to interact with gremlin in the console as if the promise-returning functions returned values:

```
node > var pipe = g.V('name', 'marko')
node > var v = pipe.next()
node > v.value('name')
'marko'
```

The gremlin-console application contained in this package does not yet have these enhancements. For early access to a console with these enhancements, use the repository [gremlin-repl](https://github.com/jimlloyd/gremlin-repl).

## Dependencies

[__node-java__](https://github.com/joeferner/node-java)

Bridge API to connect with existing Java APIs. Please read the [__node-java__](https://github.com/joeferner/node-java) installation notes, as it outlines how to install the node-java module on specific platforms and its dependencies.

*NOTE: TinkerPop3 requires Java 1.8.*

[__maven__](http://maven.apache.org/index.html)

Maven enables the installation of the base jar files.

## Installation

```bash
$ npm install gremlin-v3
```

gremlin-v3 includes the required .jar files for Gremlin and the TinkerPop stack. It doesn't include any backend specific jars for databases such as Titan or OrientDB.

## Configuration

The `Gremlin` constructor takes in an object with two properties; `classpath` which allows you to load in jar files from your own project and `options` which allows you to supply parameters to the Java runtime.

```javascript
var Gremlin = require('gremlin');
var gremlin = new Gremlin({
  classpath: [
    path.join(__dirname, '..', 'target', '**', '*.jar')
  ],
  options: [
    '-XX:+UseThreadPriorities',
    '-XX:ThreadPriorityPolicy=42',
    '-XX:+UseParNewGC',
    '-XX:+UseConcMarkSweepGC',
    '-XX:+CMSParallelRemarkEnabled',
    '-XX:SurvivorRatio=8',
    '-XX:MaxTenuringThreshold=1',
    '-XX:CMSInitiatingOccupancyFraction=75',
    '-XX:+UseCMSInitiatingOccupancyOnly',
    '-XX:+UseTLAB',
    '-XX:+UseCondCardMark'
  ]
});
```

## Connecting to a Graph

As mentioned above, gremlin-v3 only includes jars for the reference TinkerPop3 implementation, TinkerGraph.

To use another database implementing the **TinkerPop3** property graph interfaces, the Gremlin constructor must point to a location with the databases compiled jars.

Once the dependent jars are properly loaded into the Java runtime, a graph instance must be created and passed to `gremlin.wrap`.

**Note: Titan 0.4/0.5 is not compatible with TinkerPop3. Titan 0.9 is under development, and has not yet beeen tested with this package.**

### TinkerGraph

```javascript
var TinkerGraphFactory = gremlin.java.import('com.tinkerpop.gremlin.tinkergraph.structure.TinkerFactory');
var graph = TinkerGraphFactory.openSync();
var g = gremlin.wrap(graph);
```

## Working with the Database

Once you have connected to the database, you are able to call all implementation specific database methods. For example here's how you would add two Vertices and an Edge and associate them in an OrientDB graph.

```javascript
var luca = graph.addVertexSync(null);
luca.setPropertySync( 'name', 'Luca' );

var marko = graph.addVertexSync(null);
marko.setPropertySync( 'name', 'Marko' );

var lucaKnowsMarko = graph.addEdgeSync(null, luca, marko, 'knows');

graph.commitSync();
```

## Examples

A good resource to understand the Gremlin API (for TinkerPop2) is [GremlinDocs](http://gremlindocs.com/).  Most of the examples given at GremlinDocs have been translated to work in a node REPL, and encoded to run as unit tests, but in a separate repository. See [gremlin-repl](https://github.com/jimlloyd/gremlin-repl), and in particular these expected output files:

1. [gremlindocs-transform](https://github.com/jimlloyd/gremlin-repl/blob/master/test/data/gremlindocs-transform.expected)
2. [gremlindocs-filter](https://github.com/jimlloyd/gremlin-repl/blob/master/test/data/gremlindocs-filter.expected)
3. [gremlindocs-sideeffects](https://github.com/jimlloyd/gremlin-repl/blob/master/test/data/gremlindocs-side-effects.expected)
4. [gremlindocs-branch](https://github.com/jimlloyd/gremlin-repl/blob/master/test/data/gremlindocs-branch.expected)
5. [gremlindocs-methods](https://github.com/jimlloyd/gremlin-repl/blob/master/test/data/gremlindocs-methods.expected)

## Authors

TinkerPop3:

* Jim Lloyd - [jimlloyd](https://github.com/jimlloyd)

TinkerPop2:

* Frank Panetta  - [Follow @entrendipity](https://twitter.com/intent/follow?screen_name=entrendipity)
* Anthony Pesch - [inolen](https://github.com/inolen)

## Contributors

Jared Camins-Esakov

## License
### The MIT License (MIT)

Copyright (c) 2013 entrendipity pty ltd
Parts copyright (c) 2013 C & P Bibliography Services, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
