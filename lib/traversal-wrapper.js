'use strict';

var _ = require('lodash');
var GraphWrapper = require('./graph-wrapper');
var Q = require('q');
var dlog = require('debug')('traversal-wrapper');

var assert = require('assert'); // TODO: remove

var TraversalWrapper = module.exports = function (gremlin, traversal) {
  assert.ok(traversal);
  // Both Traversal and AnonymousGraphTraversal have a compatible shape.
  assert.ok(gremlin.isType(traversal, 'com.tinkerpop.gremlin.process.Traversal') ||
            gremlin.isType(traversal, 'com.tinkerpop.gremlin.process.graph.AnonymousGraphTraversal'));
  this.gremlin = gremlin;
  this.traversal = traversal;
};

TraversalWrapper.prototype.unwrap = function () {
  return this.traversal;
};

TraversalWrapper.prototype.clone = function () {
  return this.add('clone', []);
};

TraversalWrapper.prototype.add = function (type, args) {
  // GraphTraversal methods return "this", so we could reuse this TraversalWrapper.  However, we also use
  // TraversalWrapper for AnonymousGraphTraversal, which does NOT return "this".  Thus, we wrap the return value in a
  // new TraversalWrapper to be safe.
  var that = this.traversal[type + 'Sync'].apply(this.traversal, args);
  return this.gremlin.wrapTraversal(that);
};

TraversalWrapper.prototype.V = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('V', args);
};

TraversalWrapper.prototype.E = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('E', args);
};

TraversalWrapper.prototype.has = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('has', args);
};

TraversalWrapper.prototype.hasNot = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('hasNot', args);
};

TraversalWrapper.prototype.between = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('between', args);
};

TraversalWrapper.prototype.bothE = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('bothE', args);
};

TraversalWrapper.prototype.both = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('both', args);
};

TraversalWrapper.prototype.bothV = function () {
  return this.add('bothV');
};

TraversalWrapper.prototype.idEdge = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('idEdge', args);
};

TraversalWrapper.prototype.id = function () {
  return this.add('id');
};

TraversalWrapper.prototype.idVertex = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('idVertex', args);
};

TraversalWrapper.prototype.inE = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('inE', args);
};

TraversalWrapper.prototype.in = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('in', args);
};

TraversalWrapper.prototype.addInE = function (edgeLabel, stepLabel, props) {
  var that = this.traversal.addInESync(edgeLabel, stepLabel, this.gremlin.propertiesToVarArgs(props));
  return this.gremlin.wrapTraversal(that);
};

TraversalWrapper.prototype.addOutE = function (edgeLabel, stepLabel, props) {
  var that = this.traversal.addOutESync(edgeLabel, stepLabel, this.gremlin.propertiesToVarArgs(props));
  return this.gremlin.wrapTraversal(that);
};

TraversalWrapper.prototype.addBothE = function (edgeLabel, stepLabel, props) {
  var that = this.traversal.addBothESync(edgeLabel, stepLabel, this.gremlin.propertiesToVarArgs(props));
  return this.gremlin.wrapTraversal(that);
};

TraversalWrapper.prototype.addE = function (direction, edgeLabel, stepLabel, props) {
  var that = this.traversal.addESync(direction, edgeLabel, stepLabel, this.gremlin.propertiesToVarArgs(props));
  return this.gremlin.wrapTraversal(that);
};

TraversalWrapper.prototype.inV = function () {
  return this.add('inV');
};

TraversalWrapper.prototype.label = function () {
  return this.add('label');
};

TraversalWrapper.prototype.outE = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('outE', args);
};

TraversalWrapper.prototype.out = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('out', args);
};

TraversalWrapper.prototype.outV = function () {
  return this.add('outV');
};

TraversalWrapper.prototype.map = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('map', args);
};

TraversalWrapper.prototype.value = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('value', args);
};

TraversalWrapper.prototype.values = function () {
  var args = Array.prototype.slice.call(arguments);
  this.gremlin._parseVarargs(args, 'java.lang.String');
  return this.add('values', args);
};

TraversalWrapper.prototype.step = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('step', args);
};

/////////////////////////
/// BRANCH TRAVERSALS ///
/////////////////////////

TraversalWrapper.prototype.choose = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  // Two overloads distinguished by number of args:
  // choose(Predicate<E> choose, Traversal<?, E2> trueChoice, Traversal<?, E2> falseChoice)
  // choose(Function<E, M> map, Map<M, Traversal> choices)
  if (args.length === 3) {
    // Nothing to do, since javify already unwrapped the traversals.
  } else if (args.length === 2) {
    // Unwrap the choices
    var choices = args[1];
    if (!this.gremlin.isType(choices, 'java.util.Map')) {

      // We weren't provided with a Java map, so build one.
      var unwrapped = new this.gremlin.HashMap();

      // The "isType" call will poke a key '_isType' into the choices object.
      delete choices._isType;

      // Unwrap each traversal as we put it in the Java map.
      _.forEach(choices, function (traversal, choice) {
        unwrapped.putSync(choice, traversal.unwrap());
      });

      args[1] = choices = unwrapped;
    }
  }
  return this.add('choose', args);
};

TraversalWrapper.prototype.copySplit = function () {  // TK2 only?
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  this.gremlin._parseVarargs(args, 'com.tinkerpop.gremlin.process.Traversal');
  return this.add('copySplit', args);
};

TraversalWrapper.prototype.exhaustMerge = function () {
  return this.add('exhaustMerge');
};

TraversalWrapper.prototype.fairMerge = function () {
  return this.add('fairMerge');
};

TraversalWrapper.prototype.ifThenElse = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('ifThenElse', args);
};

/////////////////////////
/// FILTER TRAVERSALS ///
/////////////////////////

TraversalWrapper.prototype.and = function (/*final Traversal<E, ?>... traversals*/) {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  this.gremlin._parseVarargs(args, 'com.tinkerpop.gremlin.process.Traversal');
  return this.add('and', args);
};

TraversalWrapper.prototype.back = function (step) {
  var args = Array.prototype.slice.call(arguments);
  return this.add('back', args);
};

TraversalWrapper.prototype.dedup = function (closure) {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('dedup', args);
};

TraversalWrapper.prototype.except = function () {
  var args = Array.prototype.slice.call(arguments);
  if (this.gremlin.isType(args[0], 'java.util.Collection')) {
    // assume except(final Collection<E> collection)
  } else if (_.isArray(args[0])) {
    // assume except(final Collection<E> collection)
    args[0] = this.gremlin.toListSync(args[0]);
  } else {
    // assume except(final String... namedSteps)
    this.gremlin._parseVarargs(args, 'java.lang.String');
  }
  return this.add('except', args);
};

TraversalWrapper.prototype.filter = function (closure) {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('filter', args);
};

TraversalWrapper.prototype.or = function (/*final Traversal<E, ?>... traversals*/) {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  this.gremlin._parseVarargs(args, 'com.tinkerpop.gremlin.process.Traversal');
  return this.add('or', args);
};

TraversalWrapper.prototype.random = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('random', args);
};

TraversalWrapper.prototype.index = function (idx) {
  return this.add('range', [idx, idx]);
};

TraversalWrapper.prototype.range = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('range', args);
};

TraversalWrapper.prototype.retain = function (/*final Collection<E> collection*/) {
  var args = Array.prototype.slice.call(arguments);
  if (this.gremlin.isType(args[0], 'java.util.Collection')) {
    // assume retain(final Collection<E> collection)
  } else if (_.isArray(args[0])) {
    // assume retain(final Collection<E> collection)
    args[0] = this.gremlin.toListSync(args[0]);
  } else {
    // assume retain(final String... namedSteps)
    this.gremlin._parseVarargs(args, 'java.lang.String');
  }
  return this.add('retain', args);
};

TraversalWrapper.prototype.simplePath = function () {
  return this.add('simplePath');
};

//////////////////////////////
/// SIDE-EFFECT TRAVERSALS ///
//////////////////////////////

// TraversalWrapper.prototype.aggregate = function () {
//   var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
//   if (_.isArray(args[0])) {
//     args[0] = this.gremlin.toListSync(args[0]);
//   }
//   return this.add('aggregate', args);
// };

TraversalWrapper.prototype.aggregate = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('aggregate', args);
};

TraversalWrapper.prototype.optional = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('optional', args);
};

TraversalWrapper.prototype.groupBy = function (map, closure) {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('groupBy', args);
};

TraversalWrapper.prototype.groupCount = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('groupCount', args);
};

TraversalWrapper.prototype.inject = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('inject', args);
};

TraversalWrapper.prototype.linkOut = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('linkOut', args);
};

TraversalWrapper.prototype.linkIn = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('linkIn', args);
};

TraversalWrapper.prototype.linkBoth = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('linkBoth', args);
};

TraversalWrapper.prototype.sideEffect = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('sideEffect', args);
};

TraversalWrapper.prototype.sack = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('sack', args);
};

TraversalWrapper.prototype.store = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  if (_.isArray(args[0])) {
    args[0] = this.gremlin.toListSync(args[0]);
  }
  return this.add('store', args);
};

TraversalWrapper.prototype.table = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  this.gremlin._parseVarargs(args, 'groovy.lang.Closure');
  if (_.isArray(args[1])) {
    args[1] = this.gremlin.toListSync(args[1]);
  }
  return this.add('table', args);
};

TraversalWrapper.prototype.tree = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  this.gremlin._parseVarargs(args, 'groovy.lang.Closure');
  return this.add('tree', args);
};

TraversalWrapper.prototype.withSack = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('withSack', args);
};

////////////////////////////
/// TRANSFORM TRAVERSALS ///
////////////////////////////

TraversalWrapper.prototype.gather = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('gather', args);
};

TraversalWrapper.prototype._ = function () {
  return this.add('_');
};

TraversalWrapper.prototype.memoize = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('memoize', args);
};

TraversalWrapper.prototype.order = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('order', args);
};

TraversalWrapper.prototype.path = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('path', args);
};

TraversalWrapper.prototype.scatter = function () {
  return this.add('scatter');
};

// There are two variants of select in the TinkerPop3 API:
// 1. default <E2> GraphTraversal<S,E2> select(String stepLabel)
// 2. default <E2> GraphTraversal<S,Map<String,E2>> select(String... stepLabels)
// The single-arg case needs to be detected, because it affects the type of the traversal.
// We handle the variadic argument case by collapsing multiple args into a single array arg.
TraversalWrapper.prototype.select = function () {
  var args = Array.prototype.slice.call(arguments);
  if (args.length !== 1) {
    this.gremlin._parseVarargs(args, 'java.lang.String');
  }
  return this.add('select', args);
};

TraversalWrapper.prototype.shuffle = function () {
  return this.add('shuffle');
};

TraversalWrapper.prototype.cap = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('cap', args);
};

TraversalWrapper.prototype.count = function () {
  return this.add('count');
};

TraversalWrapper.prototype.orderMap = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('orderMap', args);
};

TraversalWrapper.prototype.transform = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('transform', args);
};

//////////////////////////
/// UTILITY TRAVERSALS ///
//////////////////////////

TraversalWrapper.prototype.as = function () {
  var args = Array.prototype.slice.call(arguments);
  return this.add('as', args);
};

TraversalWrapper.prototype.by = function () {
  var args = Array.prototype.slice.call(arguments).map(this.gremlin._javify.bind(this.gremlin));
  return this.add('by', args);
};

TraversalWrapper.prototype.start = function (obj) {
  if (this.gremlin.isType(obj, 'java.lang.Iterable')) {
    throw new Error('Resolve iterable instances asynchronously to iterators to avoid unexpected potential blocking (e.g. it.iterator())');
  }
  return this.add('start', [obj]);
};

///////////////////////
/// UTILITY METHODS ///
///////////////////////

function traversalPromiseWrap(op) {
  return function () {
    var argPair = this.gremlin.extractArguments(Array.prototype.slice.call(arguments));
    dlog('traversalPromiseWrap(%s)', op, argPair);
    return Q.npost(this.traversal, op, argPair.args).nodeify(argPair.callback);
  };
}

function traversalPromiseJsifyWrap(op) {
  return function () {
    var self = this;
    var argPair = this.gremlin.extractArguments(Array.prototype.slice.call(arguments));
    dlog('traversalPromiseJsifyWrap(%s)', op, argPair, this.traversal[op]);
    return Q.npost(this.traversal, op, argPair.args)
      .then(function (res) {
        var jres = self.gremlin._jsify(res);
        dlog('traversalPromiseJsifyWrap(%s)(result) = ', res, jres);
        return jres;
      })
      .nodeify(argPair.callback);
  };
}

// TraversalWrapper.prototype.count = traversalPromiseJsifyWrap('count');

TraversalWrapper.prototype.iterate = traversalPromiseWrap('iterate');
TraversalWrapper.prototype.iterator = traversalPromiseWrap('iterator');
TraversalWrapper.prototype.hasNext = traversalPromiseWrap('hasNext');
TraversalWrapper.prototype.next = traversalPromiseJsifyWrap('next');
TraversalWrapper.prototype.fill = traversalPromiseWrap('fill');
TraversalWrapper.prototype.enablePath = traversalPromiseWrap('enablePath');
TraversalWrapper.prototype.optimize = traversalPromiseWrap('optimize');
TraversalWrapper.prototype.remove = traversalPromiseWrap('remove');
TraversalWrapper.prototype.reset = traversalPromiseWrap('reset');
TraversalWrapper.prototype.getCurrentPath = traversalPromiseWrap('getCurrentPath');
TraversalWrapper.prototype.getStarts = traversalPromiseWrap('getStarts');
TraversalWrapper.prototype.get = traversalPromiseWrap('get');
TraversalWrapper.prototype.equals = traversalPromiseWrap('equals');
TraversalWrapper.prototype.size = traversalPromiseWrap('size');
TraversalWrapper.prototype.toList = traversalPromiseWrap('toList');

TraversalWrapper.prototype.toArray = function (callback) {
  var self = this;

  return self.toList()
    .then(function (list) {
      var arr = [];
      for (var i = 0, l = list.sizeSync(); i < l; i++) {
        var it = list.getSync(i);
        arr.push(self.gremlin._jsify(it));
      }
      dlog('TraversalWrapper.prototype.toArray:', arr.length, arr);
      return arr;
    })
    .nodeify(callback);
};

TraversalWrapper.prototype.toArraySync = function () {
  var self = this;
  var list = self.traversal.toListSync();
  var arr = [];
  for (var i = 0, l = list.sizeSync(); i < l; i++) {
    var it = list.getSync(i);
    arr.push(self.gremlin._jsify(it));
  }
  dlog('TraversalWrapper.prototype.toArraySync:', arr.length, arr);
  return arr;
};

TraversalWrapper.prototype.asJSONSync = function () {
  var self = this;
  var array = this.toArraySync().map(function (elem) {
    return self.gremlin._asJSON(elem);
  });

  return JSON.parse(JSON.stringify(array));
};

// Fully iterates the traversal, applying *process* to each element returned.
// *process* is a function(elem) {} returning and may be either synchronous or return a promise.
// Returns a promise if callback is omitted, otherwise calls callback when all elements are processed.
TraversalWrapper.prototype.forEach = function (process, callback) {
  return this.gremlin.forEach(this, process, callback);
};

// ## Subgraph: the subgraph step, see http://www.tinkerpop.com/docs/3.0.0-SNAPSHOT/#subgraph-step
// `edgePredicate` must be one of the following:
// - a string expressing a Groovy closure of an edge predicate.
// - a Java Predicate object
// Note that in Java the `subgraph()` step must be followed by a `next()` step to return the subgraph.
// Here we automatically call `next()` so that we can return a `GraphWrapper` instance for the subgraph.
TraversalWrapper.prototype.subgraph = function (edgePredicate, callback) {
  var self = this;
  edgePredicate = self.gremlin._javify(edgePredicate);
  return Q.nbind(self.traversal.subgraph, self.traversal)(edgePredicate)
    .then(function (trav) { return self.gremlin.wrapTraversal(trav).next(); })
    .then(function (sg) { return new GraphWrapper(self.gremlin, sg); })
    .nodeify(callback);
};
