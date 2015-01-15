'use strict';

var _ = require('lodash');
var assert = require('assert');
var path = require('path');
var Q = require('q');
var Gremlin = require('../lib/gremlin');
var GraphWrapper = require('../lib/graph-wrapper');
var TraversalWrapper = require('../lib/traversal-wrapper');
var VertexWrapper = require('../lib/vertex-wrapper');
var EdgeWrapper = require('../lib/edge-wrapper');

var dlog = require('debug')('test:traversal');

// For reference, see the java interface:
// https://github.com/tinkerpop/tinkerpop3/blob/master/gremlin-core/src/main/java/com/tinkerpop/gremlin/process/Traversal.java

function verticesMapToStrings(verts) {
  return _.map(verts, function (v) {
    assert.ok(v);
    assert.ok(v instanceof VertexWrapper);
    return v.toStringSync();
  });
}

function edgesMapToStrings(edges) {
  return _.map(edges, function (e) {
    assert.ok(e);
    assert.ok(e instanceof EdgeWrapper);
    return e.toStringSync();
  });
}

suite('traversal-wrapper', function () {
  var gremlin;
  var java;
  var graph;
  var g;

  suiteSetup(function () {
    gremlin = new Gremlin();
    java = gremlin.java;
  });

  setup(function () {
    var TinkerGraphFactory = gremlin.java.import('com.tinkerpop.gremlin.tinkergraph.structure.TinkerFactory');
    graph = TinkerGraphFactory.createClassicSync();
    g = gremlin.wrap(graph);
  });

  test('Confirm Traversal API', function (done) {
    var expected = [
      // This is an index of the GraphTraversal API we implement.
      // See http://www.tinkerpop.com/javadocs/3.0.0.M7/full/com/tinkerpop/gremlin/process/graph/GraphTraversal.html
      // This test will fail only if TinkerPop changes the api of 'com.tinkerpop.gremlin.process.graph.GraphTraversal'
      'addBothE', 'addE', 'addInE', 'addOutE', 'addStart', 'addStarts', 'addStep', 'aggregate', 'applyStrategies',
      'as', 'asAdmin', 'back', 'between', 'both', 'bothE', 'bothV', 'branch', 'by', 'cap', 'choose', 'clone', 'coin',
      'count', 'cyclicPath', 'dedup', 'emit', 'equals', 'except', 'fill', 'filter', 'flatMap', 'fold',
      'forEachRemaining', 'getClass', 'getSideEffects', 'getSteps', 'getStrategies', 'getTraversalEngine',
      'getTraversalHolder', 'getTraverserGenerator', 'group', 'groupCount', 'has', 'hasNext', 'hasNot', 'hashCode',
      'id', 'identity', 'in', 'inE', 'inV', 'inject', 'iterate', 'key', 'label', 'limit', 'local', 'map', 'match',
      'next', 'notify', 'notifyAll', 'order', 'otherV', 'out', 'outE', 'outV', 'path', 'profile', 'properties',
      'propertyMap', 'range', 'remove', 'removeStep', 'repeat', 'reset', 'retain', 'reverse', 'sack', 'sample',
      'select', 'setSideEffects', 'setStrategies', 'setTraversalHolder', 'shuffle', 'sideEffect', 'simplePath',
      'store', 'subgraph', 'submit', 'sum', 'timeLimit', 'times', 'to', 'toBulkSet', 'toE', 'toList', 'toSet',
      'toString', 'toV', 'tree', 'tryNext', 'unfold', 'union', 'until', 'value', 'valueMap', 'values', 'wait', 'where',
      'withPath', 'withSack', 'withSideEffect'
    ];
    var javaTraversal = g.V().unwrap();
    assert.ok(gremlin.isType(javaTraversal, 'com.tinkerpop.gremlin.process.graph.GraphTraversal'));
    var methods = _.functions(javaTraversal);
    var asyncMethods = _.filter(methods, function (method) { return !method.match(/Sync$/); }).sort();
    var syncMethods = _.filter(methods, function (method) { return method.match(/Sync$/); });
    syncMethods = _.map(syncMethods, function (method) { return method.match(/^(\w+)Sync$/)[1]; }).sort();
    assert.deepEqual(asyncMethods, expected);
    assert.deepEqual(syncMethods, expected);
    done();
  });

  test('g.V().has("name", "marko") -> v.value("name")', function (done) {
    g.V().has('name', 'marko').next(function (err, v) {
      v.value('name', function (err, value) {
        assert.strictEqual(value, 'marko');
        done();
      });
    });
  });

  test('g.V().next() async', function (done) {
    g.V().next(function (err, v) {
      assert.ifError(err);
      assert.ok(v instanceof VertexWrapper);
      done();
    });
  });

  test('g.V().next() promise', function (done) {
    var promise = g.V().next();
    assert.ok(Q.isPromise(promise));
    promise.then(function (v) { assert.ok(v instanceof VertexWrapper); })
      .done(done);
  });

  test('g.V().iterate() promise', function (done) {
    dlog('creating traversal');
    var trav = g.V();
    dlog('created traversal for all vertices');
    var promise = trav.iterate();
    dlog('created promise for traversal.iterate()');
    assert.ok(Q.isPromise(promise));
    promise.then(function (emptyTraversal) { dlog('resolved promise'); assert.ok(emptyTraversal); })
      .done(done);
  });

  test('g.V().has("name", "marko") -> v.value("name")', function (done) {
    g.V().has('name', 'marko').next(function (err, v) {
      v.value('name', function (err, value) {
        assert.strictEqual(value, 'marko');
        done();
      });
    });
  });

  test('V().next()', function (done) {
    var traversal = g.V();
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.next(function (err, v) {
      assert.ifError(err);
      assert.ok(v instanceof VertexWrapper);

      v.value('name', function (err, name) {
        assert.ifError(err);
        assert.strictEqual(name, 'marko');
        done();
      });
    });
  });

  test('V().next()', function (done) {
    var traversal = g.V();
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.next(function (err, v) {
      assert.ifError(err);
      assert.ok(v instanceof VertexWrapper);

      var jsonObj = v.toJSON();
      jsonObj = VertexWrapper.simplifyVertexProperties(jsonObj);
      var expected = {
        id: 1,
        label: 'vertex',
        type: 'vertex',
        properties:
        {
          name: 'marko',
          age: 29
        }
      };
      assert.deepEqual(jsonObj, expected);
      done();
    });
  });

  test('V().has("lang").asJSONSync', function (done) {
    var jsonObj = g.V().has('lang').asJSONSync();
    jsonObj = VertexWrapper.simplifyVertexProperties(jsonObj);
    var expected = [
      {
        id: 3,
        label: 'vertex',
        type: 'vertex',
        properties: {
          name: 'lop',
          lang: 'java'
        }
      },
      {
        id: 5,
        label: 'vertex',
        type: 'vertex',
        properties: {
          name: 'ripple',
          lang: 'java'
        }
      }
    ];
    assert.deepEqual(jsonObj, expected);
    done();
  });

  test('V().has(key, value)', function (done) {
    var traversal = g.V().has('name', 'josh');
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.next(function (err, v) {
      assert.ifError(err);
      assert.ok(v instanceof VertexWrapper);

      v.value('name', function (err, name) {
        assert.ifError(err);
        assert.strictEqual(name, 'josh');
        done();
      });
    });
  });

  test('V().toArray()', function (done) {
    var traversal = g.V();
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.toArray(function (err, a) {
      assert.ifError(err);
      assert.ok(_.isArray(a));
      var vstrs = _.map(a, function (v) { return v.toStringSync(); });
      assert.deepEqual(vstrs, [ 'v[1]', 'v[2]', 'v[3]', 'v[4]', 'v[5]', 'v[6]' ]);
      done();
    });
  });

  test('V().has(key, value).toArray()', function (done) {
    var traversal = g.V().has('name', 'josh');
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.toArray(function (err, a) {
      assert.ifError(err);
      assert.ok(_.isArray(a));
      var vstrs = _.map(a, function (v) { return v.toStringSync(); });
      assert.deepEqual(vstrs, [ 'v[4]' ]);
      done();
    });
  });

  test('g.V().asJSONSync()', function (done) {
    var traversal = g.V();
    assert.ok(traversal instanceof TraversalWrapper);

    var verts = traversal.asJSONSync();
    verts = VertexWrapper.simplifyVertexProperties(verts);
    var expected = [
      { id: 1,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'marko',
           age: 29 } },
      { id: 2,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'vadas',
           age: 27 } },
      { id: 3,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'lop',
           lang: 'java' } },
      { id: 4,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'josh',
           age: 32 } },
      { id: 5,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'ripple',
           lang: 'java' } },
      { id: 6,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'peter',
           age: 35 } }
    ];
    assert.deepEqual(verts, expected);
    done();
  });

  test('g.E().next()', function (done) {
    var traversal = g.E();
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.next(function (err, e) {
      assert.ifError(err);
      assert.ok(e instanceof EdgeWrapper);
      assert.strictEqual(e.toStringSync(), 'e[7][1-knows->2]');
      done();
    });
  });

  test('g.E().toArray() -> map(toStringSync)', function (done) {
    var traversal = g.E();
    assert.ok(traversal instanceof TraversalWrapper);

    traversal.toArray(function (err, edges) {
      assert.ifError(err);
      assert.ok(_.isArray(edges));
      var estrs = edgesMapToStrings(edges);
      assert.deepEqual(estrs, [
        'e[7][1-knows->2]',
        'e[8][1-knows->4]',
        'e[9][1-created->3]',
        'e[10][4-created->5]',
        'e[11][4-created->3]',
        'e[12][6-created->3]'
      ]);
      done();
    });
  });

  test('g.E().asJSONSync', function (done) {
    var traversal = g.E();
    assert.ok(traversal instanceof TraversalWrapper);

    var edges = traversal.asJSONSync();
    var expected = [
      { inV: 2,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 7,
        label: 'knows',
        type: 'edge',
        outV: 1,
        properties: { weight: 0.5 } },
      { inV: 4,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 8,
        label: 'knows',
        type: 'edge',
        outV: 1,
        properties: { weight: 1 } },
      { inV: 3,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 9,
        label: 'created',
        type: 'edge',
        outV: 1,
        properties: { weight: 0.4 } },
      { inV: 5,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 10,
        label: 'created',
        type: 'edge',
        outV: 4,
        properties: { weight: 1 } },
      { inV: 3,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 11,
        label: 'created',
        type: 'edge',
        outV: 4,
        properties: { weight: 0.4 } },
      { inV: 3,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 12,
        label: 'created',
        type: 'edge',
        outV: 6,
        properties: { weight: 0.2 } }
    ];
    assert.deepEqual(edges, expected);
    done();
  });

  test('g.E().has(key, val)', function (done) {
    var edges = g.E().has(gremlin.T.id, 7).asJSONSync();
    assert.strictEqual(edges.length, 1);
    var expected = [
      { inV: 2,
        inVLabel: 'vertex',
        outVLabel: 'vertex',
        id: 7,
        label: 'knows',
        type: 'edge',
        outV: 1,
        properties: { weight: 0.5 } }
    ];
    assert.deepEqual(edges, expected);
    done();
  });

  test('g.E().has(weight, gt, 0.5)', function (done) {
    g.E().has('weight', gremlin.Compare.gt, java.newFloat(0.5)).next(function (err, e) {
      assert.ifError(err);
      assert.ok(e instanceof EdgeWrapper);
      e.value('weight', function (err, weight) {
        assert.ifError(err);
        assert(weight > 0.5);
        assert.strictEqual(e.toStringSync(), 'e[8][1-knows->4]');
        done();
      });
    });
  });

  test('has(string key, object value)', function (done) {
    g.V().has('name', 'marko').next(function (err, v) {
      assert.ifError(err);
      v.value('name', function (err, name) {
        assert.ifError(err);
        assert.strictEqual(name, 'marko');
        done();
      });
    });
  });

  test('has(string key, object value).count()', function (done) {
    g.V().has('name', 'marko').count().next(function (err, count) {
      assert.ifError(err);
      assert.strictEqual(count, 1);
      done();
    });
  });

  test('has(string key, token, object value)', function (done) {
    g.V().has('name', gremlin.Compare.eq, 'marko').next(function (err, v) {
      assert.ifError(err);
      v.value('name', function (err, name) {
        assert.ifError(err);
        assert.strictEqual(name, 'marko');
        done();
      });
    });
  });

  test('hasNot(string key, object value)', function (done) {
    g.V().hasNot('age').count().next(function (err, count) {
      assert.ifError(err);
      assert.strictEqual(count, 2);
      done();
    });
  });

  // hasNot(key, val) not in TK3. has(key, Compare.ne, val) doesn't work the same.
  // test.skip('hasNot(string key, object value)', function (done) {
  //   g.V().hasNot('age', 27).count().next(function (err, count) {
  //     assert.ifError(err);
  //     assert.strictEqual(count, 5);
  //     done();
  //   });
  // });

  test('between(string key, object start, object end)', function (done) {
    var lower = 0.3;
    var upper = 0.9;

    var traversal = g.E().between('weight', java.newFloat(lower), java.newFloat(upper));
    traversal.toArray()
      .then(function (a) {
        assert(_.isArray(a));
        assert.strictEqual(a.length, 3);
        var p = a.map(function (e) { return e.value('weight'); });
        return Q.all(p);
      })
      .then(function (weights) {
        weights.map(function (w) {
          assert(w >= lower && w <= upper);
        });
      })
      .done(done);
  });

  test('bothE(string... labels)', function (done) {
    g.V().bothE('knows', 'created').toArray(function (err, edges) {
      assert.ifError(err);
      assert.strictEqual(edges.length, 12);
      var counts = _.countBy(edges, function (e) { return e.getLabel(); });
      var expected = { created: 8, knows: 4 };
      assert.deepEqual(counts, expected);
      done();
    });
  });

  test('both(string... labels).toArray()', function (done) {
    g.V().both('knows').toArray(function (err, verts) {
      assert.strictEqual(verts.length, 4);
      var strs = verticesMapToStrings(verts);
      assert.deepEqual(strs, ['v[2]', 'v[4]', 'v[1]', 'v[1]']);
      done();
    });
  });

  test('both(string... labels).dedup().toArray()', function (done) {
    g.V().both('knows').dedup().toArray(function (err, verts) {
      assert.ifError(err);
      assert.strictEqual(verts.length, 3);
      var strs = verticesMapToStrings(verts);
      assert.deepEqual(strs, ['v[2]', 'v[4]', 'v[1]']);
      done();
    });
  });

  test('bothV()', function (done) {
    g.E().has(gremlin.T.id, 7).bothV().toArray()
      .then(function (verts) {
        var strs = verticesMapToStrings(verts);
        assert.deepEqual(strs, ['v[1]', 'v[2]']);
      }, assert.ifError)
      .done(done);
  });

  test('inV()', function (done) {
    g.E().has(gremlin.T.id, 7).inV().toArray()
      .then(function (verts) {
        var strs = verticesMapToStrings(verts);
        assert.deepEqual(strs, ['v[2]']);
      }, assert.ifError)
      .done(done);
  });

  test('inE()', function (done) {
    g.V().has('name', 'lop').inE().toArray()
      .then(function (edges) {
        var strs = edgesMapToStrings(edges);
        assert.deepEqual(strs, ['e[9][1-created->3]', 'e[11][4-created->3]', 'e[12][6-created->3]']);
      }, assert.ifError)
      .done(done);
  });

  test('in()', function (done) {
    g.V().has('name', 'lop').in().toArray()
      .then(function (verts) {
        var strs = verticesMapToStrings(verts);
        assert.deepEqual(strs, ['v[1]', 'v[4]', 'v[6]']);
      }, assert.ifError)
      .done(done);
  });

  test('outV()', function (done) {
    g.E().has(gremlin.T.id, 7).outV().toArray()
      .then(function (verts) {
        var strs = verticesMapToStrings(verts);
        assert.deepEqual(strs, ['v[1]']);
      }, assert.ifError)
      .done(done);
  });

  test('outE()', function (done) {
    g.V().has('name', 'josh').outE().toArray(function (err, edges) {
      assert.ifError(err);
      assert.strictEqual(edges.length, 2);
      done();
    });
  });

  test('out()', function (done) {
    g.V().has('name', 'josh').out().toArray(function (err, edges) {
      assert.ifError(err);
      assert.strictEqual(edges.length, 2);
      done();
    });
  });

  test('id()', function (done) {
    g.V().id().toArray(function (err, ids) {
      assert.ifError(err);
      var expected = [ 1, 2, 3, 4, 5, 6 ];
      assert.deepEqual(ids, expected);
      g.E().id().toArray(function (err, ids) {
        assert.ifError(err);
        var expected = [ 7, 8, 9, 10, 11, 12 ];
        assert.deepEqual(ids, expected);
        done();
      });
    });
  });

  test('label()', function (done) {
    g.E().label().toArray(function (err, labels) {
      assert.ifError(err);
      var expected = [ 'knows', 'knows', 'created', 'created', 'created', 'created' ];
      assert.deepEqual(labels, expected);
      done();
    });
  });

  test('value()', function (done) {
    g.V().values('name').toArray(function (err, names) {
      assert.ifError(err);
      var expected = [ 'marko', 'vadas', 'lop', 'josh', 'ripple', 'peter' ];
      assert.deepEqual(names, expected);
      g.V().values('age').toArray(function (err, ages) {
        assert.ifError(err);
        var expected = [ 29, 27, 32, 35 ];
        assert.deepEqual(ages, expected);
        done();
      });
    });
  });

  test('choose(Predicate, Traversal, Traversal)', function (done) {
    var __ = gremlin.__;

    // If the predicate is true, then do `in`, else do `out`.
    var chosen = g.V().choose('{ vertex -> vertex.value("name").length() == 5 }',
                               __.in(),
                               __.out()).values('name');

    chosen.toArray()
      .then(function (actual) {
        var expected = ['marko', 'ripple', 'lop'];
        assert.deepEqual(actual.sort(), expected.sort());
      })
      .done(done);
  });

  test('choose(Function, Map) Java Map provided', function (done) {
    var __ = gremlin.__;

    // Use the result of the function as a key to the map of traversal choices.
    var groovy = '{ vertex -> vertex.value("name").length() }';

    // The choices are based on an integer value, so we cannot use a JS object as the map because it only has string
    // keys.  Instead, we must construct a Java Map.
    var choices = new gremlin.HashMap();
    choices.putSync(5, __.in().unwrap());
    choices.putSync(4, __.out().unwrap());
    choices.putSync(3, __.both().unwrap());

    var chosen = g.V().has('age').choose(groovy, choices).values('name');
    chosen.toArray()
      .then(function (actual) {
        var expected = ['marko', 'ripple', 'lop'];
        assert.deepEqual(actual.sort(), expected.sort());
      })
      .done(done);
  });

  test('choose(Function, Map) JavaScript object provided', function (done) {
    var __ = gremlin.__;

    // Use the result of the function (which must be a string) as a key to the map of traversal choices.
    var groovy = '{ vertex -> vertex.value("name") }';

    // The choices are based on a string value, so we can use a JS object as the map.
    var choices = { marko: __.in(), josh: __.out(), lop: __.both(), vadas: __.in(), peter: __.in() };

    var chosen = g.V().has('age').choose(groovy, choices).values('name');
    chosen.toArray()
      .then(function (actual) {
        var expected = ['marko', 'ripple', 'lop'];
        assert.deepEqual(actual.sort(), expected.sort());
      })
      .done(done);
  });

  test.only('select...by(string)', function (done) {
    var traversal = g.V().as('a').out().as('b').select().by('name');
    dlog('select...by(string): ', traversal.unwrap().toStringSync());
    traversal.toArray()
      .then(function (actual) {
        var expected = [
          {'a': 'marko', 'b': 'lop'},
          {'a': 'marko', 'b': 'vadas'},
          {'a': 'marko', 'b': 'josh'},
          {'a': 'josh', 'b': 'ripple'},
          {'a': 'josh', 'b': 'lop'},
          {'a': 'peter', 'b': 'lop'},
        ];
        expected = [];
        assert.deepEqual(actual, expected);
      })
      .done(done);
  });

  // TODO
  // TraversalWrapper.prototype.idEdge = function () {
  // TraversalWrapper.prototype.id = function () {
  // TraversalWrapper.prototype.idVertex = function () {
  // TraversalWrapper.prototype.step = function () {

// No copySplit or fairMerge in TK3. What are their equivalents? jump() may provide copySplit() functionality.
//   test.skip('copySplit(), _(), and fairMerge()', function (done) {
//     g.V().both().toArray(function (err, bothed) {
//       g.V().copySplit(g._().in(), g._().out()).fairMerge().toArray(function (err, copied) {
//         assert.strictEqual(bothed.length, copied.length);
//         done();
//       });
//     });
//   });

  // TraversalWrapper.prototype.exhaustMerge = function () {
  // TraversalWrapper.prototype.fairMerge = function () {
  // TraversalWrapper.prototype.ifThenElse = function () {

  // TraversalWrapper.prototype.and = function (/*final Traversal<E, ?>... traversals*/) {
  test('as() and back()', function (done) {
    g.V().as('test').out('knows').back('test').toArray(function (err, recs) {
      assert.ifError(err);
      // assert(recs.length === 1);  // TODO: in TK2, there was 1 rec
      assert(recs.length === 2);    // TODO: but in TK3, there are 2 recs
      var vstrs = verticesMapToStrings(recs);
      assert.deepEqual(vstrs, ['v[1]', 'v[1]']);  // TODO: Did TK2 return just single v[1]?
      done();
    });
  });

  // TraversalWrapper.prototype.except = function () {

  test('filter() with Groovy closure', function (done) {
    this.timeout(5000); // A longer timeout is required on Travis
    var groovy = '{ it -> it.get().value("name") == "lop" }';
    g.V().filter(groovy).toArray(function (err, recs) {
      assert.ifError(err);
      assert.strictEqual(recs.length, 1);
      var v = recs[0];
      assert.ok(v instanceof VertexWrapper);
      var jsonObj = v.toJSON();
      jsonObj = VertexWrapper.simplifyVertexProperties(jsonObj);
      var expected = {
        id: 3,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'lop',
           lang: 'java' }
      };
      assert.deepEqual(jsonObj, expected);
      done();
    });
  });

  test('filter() with JavaScript lambda', function (done) {
    this.timeout(5000); // A longer timeout is required on Travis
    var js = 'a.get().value("name") == "lop"';
    var lambda = gremlin.newJavaScriptLambda(js);
    g.V().filter(lambda).toArray(function (err, recs) {
      assert.ifError(err);
      assert.strictEqual(recs.length, 1);
      var v = recs[0];
      assert.ok(v instanceof VertexWrapper);
      var jsonObj = v.toJSON();
      jsonObj = VertexWrapper.simplifyVertexProperties(jsonObj);
      var expected = {
        id: 3,
        label: 'vertex',
        type: 'vertex',
        properties:
         { name: 'lop',
           lang: 'java' }
      };
      assert.deepEqual(jsonObj, expected);
      done();
    });
  });

  // TraversalWrapper.prototype.or = function (/*final Traversal<E, ?>... traversals*/) {
  // TraversalWrapper.prototype.random = function () {
  // TraversalWrapper.prototype.index = function (idx) {
  // TraversalWrapper.prototype.range = function () {
  // TraversalWrapper.prototype.retain = function (/*final Collection<E> collection*/) {
  // TraversalWrapper.prototype.simplePath = function () {

  test('aggregate()', function (done) {
    // In TK3, aggregate creates a BulkSet. In TraversalWrapper._jsify we currently transform
    // BulkSets into an array of object each containing a key and a count.
    // We may change this behavior in the future.
    g.V().aggregate().next(function (err, agg) {
      assert.ifError(err);
      assert.ok(_.isArray(agg));
      assert.strictEqual(agg.length, 6);
      _.forEach(agg, function (item) {
        assert.ok(item.key instanceof VertexWrapper);
        assert.strictEqual(item.count, 1);
      });
      done();
    });
  });

  // TraversalWrapper.prototype.optional = function () {
  // TraversalWrapper.prototype.groupBy = function (map, closure) {

  test('groupCount()', function (done) {
    g.E().label().groupCount().next(function (err, agg) {
      assert.ifError(err);
      var expected = { 'created': 4, 'knows': 2 };
      assert.deepEqual(agg, expected);
      done();
    });
  });

  test('inject("daniel")', function (done) {
    g.V().has('name', 'josh').out().values('name').inject(['daniel']).toArray(function (err, actual) {
      var expected = ['daniel', 'ripple', 'lop'];
      assert.deepEqual(actual, expected);
      done();
    });
  });

  // TraversalWrapper.prototype.linkOut = function () {
  // TraversalWrapper.prototype.linkIn = function () {
  // TraversalWrapper.prototype.linkBoth = function () {
  // TraversalWrapper.prototype.sideEffect = function () {
  test('store()', function (done) {
    g.V().has('lang', 'java').store().next(function (err, agg) {
      // See comment in test for aggregate() above.
      assert.ifError(err);
      assert.ok(agg);
      assert.ok(_.isArray(agg));
      assert.strictEqual(agg.length, 2);
      _.forEach(agg, function (item) {
        assert.ok(item.key instanceof VertexWrapper);
        assert.strictEqual(item.count, 1);
        assert.equal(item.key.valueSync('lang'), 'java');
      });
      done();
    });
  });

  test('store(\'x\').cap(\'x\')', function (done) {
    g.V().has('lang', 'java').store('x').cap('x').next(function (err, agg) {
      // See comment in test for aggregate() above.
      assert.ifError(err);
      assert.ok(agg);
      assert.ok(_.isArray(agg));
      assert.strictEqual(agg.length, 2);
      _.forEach(agg, function (item) {
        assert.ok(item.key instanceof VertexWrapper);
        assert.strictEqual(item.count, 1);
        assert.equal(item.key.valueSync('lang'), 'java');
      });
      done();
    });
  });

  // TraversalWrapper.prototype.table = function () {
  // TraversalWrapper.prototype.tree = function () {
  // TraversalWrapper.prototype.gather = function () {
  // TraversalWrapper.prototype._ = function () {
  // TraversalWrapper.prototype.memoize = function () {
  // TraversalWrapper.prototype.order = function () {

  test.skip('path simple: g.V().out().out().values(\'name\').path()', function (done) {
    g.V().out().out().values('name').path().toArray(function (err, paths) {
      assert.ifError(err);
      assert.ok(paths);
      assert.ok(_.isArray(paths));
      // TODO: Check the values when we can deal with a Path object in the result.
      done();
    });
  });

  test.skip('path with edges: g.V().outE().inV().outE().inV().path()', function (done) {
    g.V().outE().inV().outE().inV().path().toArray(function (err, paths) {
      assert.ifError(err);
      assert.ok(paths);
      assert.ok(_.isArray(paths));
      // TODO: Check the values when we can deal with a Path object in the result.
      done();
    });
  });

  test.skip('path with lambda: g.V().out().out().path{it.value(\'name\')}{it.value(\'age\')}', function (done) {
    var traversal = g.V().out().out().path({ apply: function (it) { return it.value('name'); } },
                                           { apply: function (it) { return it.value('age'); } });
    traversal.toArray(function (err, paths) {
      assert.ifError(err);
      assert.ok(paths);
      assert.ok(_.isArray(paths));
      // TODO: Check the values when we can deal with a Path object in the result.
      done();
    });
  });

  test.skip('path with nested traversal', function (done) {
    // The Gremlin looks like this:
    // g.V().out().out().path{
    //   it.choose({it.get().has('age').hasNext()},
    //             g.of().out('created').values('name'),
    //             g.of().in('created').values('name')).toList()}
    // TODO: What to do with it.choose?
    // TODO: Finish this.
  });

  // TraversalWrapper.prototype.scatter = function () {
  // TraversalWrapper.prototype.shuffle = function () {

  test('select() with a single label', function (done) {
    var results = g.E().as('e')
      .inV().id().as('inV')
      .back('e').outV().id().as('outV')
      .select('inV')
      .asJSONSync();
    var expected = [2, 4, 3, 5, 3, 3];
    assert.deepEqual(results, expected);
    done();
  });

  test('select() with multiple labels', function (done) {
    var results = g.E().as('e')
      .inV().id().as('inV')
      .back('e').outV().id().as('outV')
      .select('inV', 'outV')
      .asJSONSync();
    var expected = [
      { inV: 2, outV: 1 },
      { inV: 4, outV: 1 },
      { inV: 3, outV: 1 },
      { inV: 5, outV: 4 },
      { inV: 3, outV: 4 },
      { inV: 3, outV: 6 }
    ];
    assert.deepEqual(results, expected);
    done();
  });

  test('select() with no arguments', function (done) {
    g.V().as('a').out('created').in('created').as('b').select()
      .forEach(function (pair) {
        var asJson = JSON.parse(JSON.stringify(pair));
        assert.deepEqual(_.keys(asJson), ['a', 'b']);
        _.forOwn(asJson, function (value, key) {
          assert.deepEqual(_.keys(value), ['id', 'label', 'type', 'properties']);
          assert.strictEqual(value.label, 'vertex');
          assert.strictEqual(value.type, 'vertex');
          assert.deepEqual(_.keys(value.properties), ['name', 'age']);
        });
      })
      .done(done);
  });

  test('groupCount() and cap()', function (done) {
    g.V().in().id().groupCount().cap().next(function (err, map) {
      assert.ifError(err);
      assert(map['1'] === 3);
      assert(map['4'] === 2);
      assert(map['6'] === 1);
      done();
    });
  });

  // TraversalWrapper.prototype.orderMap = function () {
  // TraversalWrapper.prototype.transform = function () {

  var testProps = {
    foo: 'bar',
    answer: 42
  };

  test('addInE()', function (done) {
    g.V().has(gremlin.T.id, 1).as('knower').out('knows').out('created').addInE('knowscreator', 'knower', testProps)
      .iterate()
      .then(function () {
        var edges = g.E().has(gremlin.T.label, 'knowscreator').asJSONSync();
        var expected = [ { inV: 5,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 12,
          label: 'knowscreator',
          type: 'edge',
          outV: 1,
          properties: { answer: 42, foo: 'bar' } },
        { inV: 3,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 13,
          label: 'knowscreator',
          type: 'edge',
          outV: 1,
          properties: { answer: 42, foo: 'bar' } }
        ];
        assert.deepEqual(edges, expected);
      })
      .done(done);
  });

  test('addE(in)', function (done) {
    g.V().has(gremlin.T.id, 1).as('knower').out('knows').out('created')
      .addE(gremlin.Direction.IN, 'knowscreator', 'knower', testProps).iterate()
      .then(function () {
        var edges = g.E().has(gremlin.T.label, 'knowscreator').asJSONSync();
        var expected = [ { inV: 5,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 12,
          label: 'knowscreator',
          type: 'edge',
          outV: 1,
          properties: { answer: 42, foo: 'bar' } },
        { inV: 3,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 13,
          label: 'knowscreator',
          type: 'edge',
          outV: 1,
          properties: { answer: 42, foo: 'bar' } }
        ];
        assert.deepEqual(edges, expected);
      })
      .done(done);
  });

  test('addOutE()', function (done) {
    g.V().has(gremlin.T.id, 1).as('known').out('knows').out('created').addOutE('creatorknows', 'known', testProps).iterate()
      .then(function () {
        var edges = g.E().has(gremlin.T.label, 'creatorknows').asJSONSync();
        var expected = [ { inV: 1,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 12,
          label: 'creatorknows',
          type: 'edge',
          outV: 5,
          properties: { answer: 42, foo: 'bar' } },
        { inV: 1,
          inVLabel: 'vertex',
          outVLabel: 'vertex',
          id: 13,
          label: 'creatorknows',
          type: 'edge',
          outV: 3,
          properties: { answer: 42, foo: 'bar' } }
        ];
        assert.deepEqual(edges, expected);
      })
      .done(done);
  });

  test('addBothE()', function (done) {
    g.V().has(gremlin.T.id, 1).as('knower').out('knows').out('created').addBothE('knows<->creator', 'knower', testProps).iterate()
      .then(function () {
        return g.E().has(gremlin.T.label, 'knows<->creator').toArray();
      })
      .then(function (edges) {
        var estrs = edgesMapToStrings(edges);
        var expected = [
          'e[12][1-knows<->creator->5]',
          'e[13][5-knows<->creator->1]',
          'e[14][1-knows<->creator->3]',
          'e[15][3-knows<->creator->1]'
        ];
        assert.deepEqual(estrs, expected);
      })
      .done(done);
  });

  test('forEach()', function (done) {
    var count = 0;
    g.E().forEach(function (elem) {
      assert.ok(elem instanceof EdgeWrapper);
      ++count;
    })
    .then(function () {
      assert.strictEqual(count, 6);
    })
    .done(done);
  });

  test('subgraph() with Groovy closure', function (done) {
    g.E().subgraph('{ it -> it.label() == "knows" }')
      .then(function (sg) {
        assert.ok(sg instanceof GraphWrapper);
        assert.strictEqual(sg.toStringSync(), 'tinkergraph[vertices:3 edges:2]');
      })
      .done(done);
  });

  test('subgraph() with JavaScript lambda', function (done) {
    var lambda = gremlin.newJavaScriptLambda('a.label() === "knows"');
    g.E().subgraph(lambda)
      .then(function (sg) {
        assert.ok(sg instanceof GraphWrapper);
        assert.strictEqual(sg.toStringSync(), 'tinkergraph[vertices:3 edges:2]');
      })
      .done(done);
  });

  // Import a Java class or package into the Groovy engine.
  // - *javaClassOrPkg* can be either class name, e.g. 'java.util.HashSet', or package spec, e.g. 'java.util.*'.
  function importGroovy(javaClassOrPkg) {
    var engine = gremlin.getEngine();
    var HashSet = gremlin.java.import('java.util.HashSet');
    var imports = new HashSet();
    imports.addSync('import ' + javaClassOrPkg);
    engine.addImportsSync(imports);
  }

  // Create a Groovy Function (GFunction)
  function makeGroovyFunction(groovy) {
    var GFunction = java.import('com.tinkerpop.gremlin.groovy.function.GFunction');
    var closure = gremlin.getEngine().evalSync(groovy);
    var gfunction = new GFunction(closure);
    return gfunction;
  }

  // Extend a traversal by adding a 'map' step that uses a Groovy function to transform the traverser.
  function mapTraversal(traversal, groovy) {
    var gfunction = makeGroovyFunction(groovy);
    var unwrapped = traversal.unwrap();
    var mappedTraversal = gremlin.wrapTraversal(unwrapped.mapSync(gfunction));
    return mappedTraversal;
  }

  test('asJSONSync with Java objects', function () {
    importGroovy('java.net.Inet4Address');
    // This will produce a list (java.util.List) containing two Inet4Address objects, testing both the translation of
    // the list into a JS array, and the "toString" of the Java objects.
    var groovy = '{ it -> [ Inet4Address.getByName("127.0.0.1"), Inet4Address.getByName("10.1.1.100") ] }';
    // Use a traversal that will produce a single vertex, which we will convert to an IP address object.
    var traversal = g.V().has('name', 'josh');
    var actual = mapTraversal(traversal, groovy).asJSONSync();
    var expected = [[{ javaClass: 'java.net.Inet4Address', toString: '/127.0.0.1' },
                     { javaClass: 'java.net.Inet4Address', toString: '/10.1.1.100' }]];
    assert.deepEqual(actual, expected);
  });

  test('asJSONSync with Java map', function () {
    // The 'select' will produce a java.util.Map, which should be transformed into a JS object.
    var traversal = g.V().has('name', 'josh').as('josh')
        .values('name').as('joshName')
        .back('josh').out()
        .values('name').as('outName')
        .select('joshName', 'outName');
    var actual = traversal.asJSONSync();
    var expected = [
      { joshName: 'josh', outName: 'ripple' },
      { joshName: 'josh', outName: 'lop' },
    ];
    assert.deepEqual(actual.sort(), expected.sort());
  });

});
