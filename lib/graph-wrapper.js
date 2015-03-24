'use strict';

var _ = require('lodash');
var dlog = require('debug')('graph-wrapper');
var fs = require('fs');
var jsonStableStringify = require('json-stable-stringify');
var VertexWrapper = require('./vertex-wrapper');
var EdgeWrapper = require('./edge-wrapper');
var Q = require('q');

var assert = require('assert');   // TODO: remove asserts

var GraphWrapper = module.exports = function (gremlin, graph) {
  assert.ok(gremlin);
  assert.ok(graph);
  this.gremlin = gremlin;
  this.graph = graph;

  // re-export some of gremlin's utility functions as
  // part of the graph wrapper instance
  this.java = gremlin.java;
  this.ClassTypes = gremlin.ClassTypes;
  this.Tokens = gremlin.Tokens;
  this.Compare = gremlin.Compare;
  this.Contains = gremlin.Contains;
  this.Direction = gremlin.Direction;
  this.ArrayList = gremlin.ArrayList;
  this.HashMap = gremlin.HashMap;
//   this.Table = gremlin.Table;    // No TK3 equivalent?
  this.Tree = gremlin.Tree;
  this.isType = gremlin.isType.bind(gremlin);
  this.toList = gremlin.toList.bind(gremlin);
  this.toListSync = gremlin.toListSync.bind(gremlin);
};

// Create a GraphSONMapper (promise) that preserves types.
GraphWrapper.prototype._newGraphSONMapper = function () {
  var callStaticMethod = Q.nbind(this.java.callStaticMethod, this.java);
  return callStaticMethod('com.tinkerpop.gremlin.structure.io.graphson.GraphSONMapper', 'build')
    .then(function (builder) {
      var embedTypes = Q.nbind(builder.embedTypes, builder);
      return embedTypes(true);
    })
    .then(function (builder) {
      var create = Q.nbind(builder.create, builder);
      return create();
    });
};

// Create a GraphSONMapper that preserves types.
GraphWrapper.prototype._newGraphSONMapperSync = function () {
  var builder = this.java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONMapper', 'build');
  builder.embedTypesSync(true);
  var mapper = builder.createSync();
  return mapper;
};

// Loads the graph as GraphSON, and returns promise to the graph (for fluent API).
GraphWrapper.prototype.loadGraphSON = function (filename, callback) {
  var self = this;
  var FileInputStream = this.java.import('java.io.FileInputStream');
  var stream = new FileInputStream(filename);
  var callStaticMethod = Q.nbind(this.java.callStaticMethod, this.java);
  return callStaticMethod('com.tinkerpop.gremlin.structure.io.graphson.GraphSONReader', 'build')
    .then(function (builder) {
      return self._newGraphSONMapper()
        .then(function (mapper) {
          var mapperQ = Q.nbind(builder.mapper, builder);
          return mapperQ(mapper);
        });
    })
    .then(function (builder) {
      var create = Q.nbind(builder.create, builder);
      return create();
    })
    .then(function (reader) {
      var readGraph = Q.nbind(reader.readGraph, reader);
      return readGraph(stream, self.graph);
    })
    .then(function () { return self; })
    .nodeify(callback);
};

// Loads the graph as GraphSON, and returns the graph (for fluent API).
GraphWrapper.prototype.loadGraphSONSync = function (filename) {
  var FileInputStream = this.java.import('java.io.FileInputStream');
  var stream = new FileInputStream(filename);
  var builder = this.java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONReader', 'build');
  var mapper = this._newGraphSONMapperSync();
  builder.mapperSync(mapper);
  var reader = builder.createSync();
  reader.readGraphSync(stream, this.graph);
  return this;
};

// Saves the graph as GraphSON, and returns promise to the graph (for fluent API).
GraphWrapper.prototype.saveGraphSON = function (filename, callback) {
  var self = this;
  var FileOutputStream = this.java.import('java.io.FileOutputStream');
  var stream = new FileOutputStream(filename);
  var callStaticMethod = Q.nbind(this.java.callStaticMethod, this.java);
  return callStaticMethod('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build')
    .then(function (builder) {
      return self._newGraphSONMapper()
        .then(function (mapper) {
          var mapperQ = Q.nbind(builder.mapper, builder);
          return mapperQ(mapper);
        });
    })
    .then(function (builder) {
      var create = Q.nbind(builder.create, builder);
      return create();
    })
    .then(function (writer) {
      var writeGraph = Q.nbind(writer.writeGraph, writer);
      return writeGraph(stream, self.graph);
    })
    .then(function () { return self; })
    .nodeify(callback);
};

// Saves the graph as GraphSON, and returns the graph (for fluent API).
GraphWrapper.prototype.saveGraphSONSync = function (filename) {
  var FileOutputStream = this.java.import('java.io.FileOutputStream');
  var stream = new FileOutputStream(filename);
  var builder = this.java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build');
  var mapper = this._newGraphSONMapperSync();
  builder.mapperSync(mapper);
  var writer = builder.createSync();
  writer.writeGraphSync(stream, this.graph);
};

// Saves the graph as human-readable, deterministic GraphSON, and returns promise to the graph (for fluent API).
GraphWrapper.prototype.savePrettyGraphSON = function (filename, callback) {
  var self = this;
  var ByteArrayOutputStream = this.java.import('java.io.ByteArrayOutputStream');
  var stream = new ByteArrayOutputStream();
  var callStaticMethod = Q.nbind(this.java.callStaticMethod, this.java);
  return callStaticMethod('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build')
    .then(function (builder) {
      return self._newGraphSONMapper()
        .then(function (mapper) {
          var mapperQ = Q.nbind(builder.mapper, builder);
          return mapperQ(mapper);
        });
    })
    .then(function (builder) {
      var create = Q.nbind(builder.create, builder);
      return create();
    })
    .then(function (writer) {
      var writeGraph = Q.nbind(writer.writeGraph, writer);
      return writeGraph(stream, self.graph);
    })
    .then(function () {
      var toString = Q.nbind(stream.toString, stream);
      return toString();
    })
    .then(function (ugly) {
      var prettyString = prettyGraphSONString(ugly);
      var writeFile = Q.nfbind(fs.writeFile);
      return writeFile(filename, prettyString);
    })
    .then(function () { return self; })
    .nodeify(callback);
};

// Saves the graph as human-readable, deterministic GraphSON, and returns the graph (for fluent API).
GraphWrapper.prototype.savePrettyGraphSONSync = function (filename) {
  // Build the GraphSON in memory in Java.
  var ByteArrayOutputStream = this.java.import('java.io.ByteArrayOutputStream');
  var stream = new ByteArrayOutputStream();
  var builder = this.java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build');
  var mapper = this._newGraphSONMapperSync();
  builder.mapperSync(mapper);
  var writer = builder.createSync();
  writer.writeGraphSync(stream, this.graph);

  // Beautify the JSON.
  var string = stream.toStringSync();
  var prettyString = prettyGraphSONString(string);

  // Write to the file.
  fs.writeFileSync(filename, prettyString);
};

// Make a GraphSON string pretty, adding indentation and deterministic format.
function prettyGraphSONString(ugly) {
  var json = JSON.parse(ugly);

  // Compute the stable JSON.
  var stringifyOpts = {
    // GraphSON requires its top level properties to be in the order mode, vertices, edges.
    space: 2,
    cmp: function (a, b) {
      if (a.key === 'edges')
        return 1;
      else if (b.key === 'edges')
        return -1;
      return a.key < b.key ? -1 : 1;
    }
  };

  var prettyString = jsonStableStringify(json, stringifyOpts);
  return prettyString;
}

GraphWrapper.prototype._supportsTransactions = function () {
  var features = this.graph.featuresSync();
  var graphFeatures = features.graphSync();
  return graphFeatures.supportsThreadedTransactionsSync();
};

GraphWrapper.prototype._getTransaction = function () {
  // Transactions in TransactionalGraph's are often, by default, bound against the
  // executing thread (e.g. as a ThreadLocal variable). This behavior is not very
  // helpful in JavaScript because while the main execution is in fact performed
  // on a single thread, often a pool of threads exist to service asynchronous tasks,
  // making our tasks often operate on an incorrect transaction instance.
  //
  // Due to this, we try and avoid this default thread-bound functionality and manage
  // our own life-cycle if the supplied graph instance provides the interface to create
  // a transaction independent of the executing thread.
  //
  if (this.graph.txn) {
    return this.graph.txn;
  }

  var supportsTransactions = this._supportsTransactions();
  if (!supportsTransactions) {
    // When transactions are not supported, we return the graph itself.
    return this.graph;
  }

  // TODO: The following introduces a new member this.graph.tx, which seems to be new with TK3.
  // Given the tx, we can create a Graph interface that is a transaction that can be executed
  // across multiple threads. Other methods involving transactions almost certainly need to
  // be updated.
  this.graph.tx = this.graph.txSync();
  this.graph.txn = this.graph.tx.createSync();
  return this.graph.txn;
};

GraphWrapper.prototype._clearTransaction = function () {
  if (this.graph.txn) {
    this.graph.tx = null;
    this.graph.txn = null;
  }
};

// com.tinkerpop.blueprints.Graph interface
GraphWrapper.prototype.addVertex = function (properties, callback) {
  var gremlin = this.gremlin;
  var txn = this._getTransaction();

  // In TP2, the first argument as an id, which was often specified as null.
  // In TP3, the first argument is an simple object with initial properties.
  // These asserts should help catch code that needs to be updated for TP3.
  assert(_.isObject(properties));
  assert(!_.isFunction(properties));

  var deferred = Q.defer();

  txn.addVertex(gremlin.propertiesToVarArgs(properties), function (err, v) {
    if (err)
      return deferred.reject(err);
    else
      return deferred.resolve(gremlin.wrapVertex(v));
  });

  return deferred.promise.nodeify(callback);
};

GraphWrapper.prototype.getVertex = function (id, callback) {
  var gremlin = this.gremlin;
  var txn = this._getTransaction();

  return Q.nbind(txn.vertexIterator, txn)(id)
    .then(function (vertexIterator) {
      return new Q(vertexIterator.hasNextSync() ? gremlin.wrapVertex(vertexIterator.nextSync()) : null);
    })
    .nodeify(callback);
};

// In Tinkerpop3, instead of graph.removeVertex(v), just do v.remove().
// GraphWrapper.prototype.removeVertex = function (vertex, callback) {
//   var txn = this._getTransaction();
//
//   if (!(vertex instanceof VertexWrapper)) {
//     throw new TypeError('vertex must be an instance of VertexWrapper');
//   }
//
//   return Q.nbind(txn.removeVertex, txn)(vertex.unwrap())
//     .nodeify(callback);
// };

GraphWrapper.prototype.addEdge = function (id, outVertex, inVertex, label, callback) {
  var gremlin = this.gremlin;
  var txn = this._getTransaction();

  if (!(outVertex instanceof VertexWrapper)) {
    throw new TypeError('outVertex must be an instance of VertexWrapper');
  }
  if (!(inVertex instanceof VertexWrapper)) {
    throw new TypeError('inVertex must be an instance of VertexWrapper');
  }

  return Q.nbind(txn.addEdge, txn)(id, outVertex.unwrap(), inVertex.unwrap(), label)
    .then(function (e) { return new Q(gremlin.wrapEdge(e)); })
    .nodeify(callback);
};

GraphWrapper.prototype.getEdge = function (id, callback) {
  var gremlin = this.gremlin;
  var txn = this._getTransaction();

  return Q.nbind(txn.edgeIterator, txn)(id)
    .then(function (edgeIterator) {
      if (edgeIterator.hasNextSync()) {
        return gremlin.wrapEdge(edgeIterator.nextSync());
      } else {
        throw new Error('The edge with id ' + id + ' of type Integer does not exist in the graph');
      }
    })
    .nodeify(callback);
};

GraphWrapper.prototype.removeEdge = function (edge, callback) {
  var txn = this._getTransaction();

  if (!(edge instanceof EdgeWrapper)) {
    throw new TypeError('edge must be an instance of EdgeWrapper');
  }

  return Q.nbind(txn.removeEdge, txn)(edge.unwrap())
    .nodeify(callback);
};

GraphWrapper.prototype.query = function () {
  var txn = this._getTransaction();
  return this.gremlin.wrapQuery(txn.querySync());
};

GraphWrapper.prototype.requiresThreadedTransactions = function () {
  var supportsTransactions = this._supportsTransactions();
  if (!this._supportsTransactions()) {
    throw new Error('Graph instance must support threaded transactions.');
  }
};

GraphWrapper.prototype.newTransaction = function () {
  this.requiresThreadedTransactions();
  var txn = this.graph.txSync();
  return this.gremlin.wrap(txn);
};

GraphWrapper.prototype.commit = function (callback) {
  this.requiresThreadedTransactions();
  var txn = this._getTransaction();
  this._clearTransaction();
  txn.commit(callback);
};

GraphWrapper.prototype.rollback = function (callback) {
  this.requiresThreadedTransactions();
  var txn = this._getTransaction();
  this._clearTransaction();
  txn.rollback(callback);
};

GraphWrapper.prototype.shutdown = function (callback) {
  this.requiresThreadedTransactions();
  var txn = this._getTransaction();
  this._clearTransaction();
  txn.shutdown(callback);
};

// gremlin shell extensions for the graph object
GraphWrapper.prototype._ = function () {
  var txn = this._getTransaction();
  var traversal = this.gremlin.wrapTraversal(txn);
  traversal.traversal._Sync();
  return traversal;
};

GraphWrapper.prototype.start = function (start) {
  var txn = this._getTransaction();
  var traversal = this.gremlin.wrapTraversal(txn);
  // conditionally unwrap, we may be being passed a Java list instead
  // of one of our wrapper JavaScript objects
  if (start.unwrap) {
    start = start.unwrap();
  }
  return traversal.start(start);
};

// Create sync GraphWrapper method that accepts any arguments and returns a traversal.
function graphTraversalWrap(op) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    dlog('graphTraversalWrap(%s)', op, args);
    var txn = this._getTransaction();
    // We use this with variadic Java calls, so pass the args as a single array.
    return this.gremlin.wrapTraversal(txn[op + 'Sync'].apply(txn, args));
  };
}

// In TK2, we could say g.V(key, value).
// In TK3, we have to say g.V().has(key, value), but we can still say g.V(vertexId, ...).
GraphWrapper.prototype.V = graphTraversalWrap('V');

// Likewise, g.E(key, value) is currently disallowed, but g.E(edgeId, ...) works.
GraphWrapper.prototype.E = graphTraversalWrap('E');

GraphWrapper.prototype.toString = function (callback) {
  return Q.nbind(this.graph.toString, this.graph)().nodeify(callback);
};

GraphWrapper.prototype.toStringSync = function () {
  return this.graph.toStringSync();
};

///////////////////////
/// UTILITY METHODS ///
///////////////////////
