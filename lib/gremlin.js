'use strict';

var _ = require('lodash');
var assert = require('assert');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var Q = require('q');
var dlog = require('debug')('gremlin-v3');

var GraphWrapper = require('./graph-wrapper');
var QueryWrapper = require('./query-wrapper');
var TraversalWrapper = require('./traversal-wrapper');
var VertexWrapper = require('./vertex-wrapper');
var EdgeWrapper = require('./edge-wrapper');
var IteratorWrapper = require('./iterator-wrapper');
var PathWrapper = require('./path-wrapper');

var java = require('redseal-java');

var Gremlin = module.exports = function (opts) {

  // java.onJvmCreated is a property that holds a function that is executed only once when
  // the JVM has been created. After creation, the property is made inaccessible.
  var jvmCreated = !_.isFunction(java.onJvmCreated);

  if (jvmCreated) {
    dlog('Gremlin initialized after JVM already created. Java:', java);
  }
  else if (opts && opts.java) {
    // In this case we assume that java has already been configured by the application.
    // The application therefore assumes responsibility for proper configuration of classpath
    // and other java options.
    // Gremlin-v3 is unable to use the asyncOptions feature of node-java, so the defacto standard
    // configuration of sync and async method variants must be used, i.e. syncSuffix='Sync' and
    // asyncSuffix=''.
    dlog('Gremlin initialized with already configured java:', java);
  }
  else {
    dlog('Gremlin initialized with unconfigured java. Opts:', opts);
    opts = opts || {};
    opts.options = opts.options || [];
    opts.classpath = opts.classpath || [];

    // Add our own JAR first, so that we can provide alternate implementation of Gremlin classes for debugging.
    opts.classpath.push(path.join(__dirname, '..', 'target', 'gremlin-node-*.jar'));
    // Add the rest of the JAR's from the Maven package.
    opts.classpath.push(path.join(__dirname, '..', 'target', 'dependency', '**', '*.jar'));

    // add options
    java.options.push('-Djava.awt.headless=true');
    for (var i = 0; i < opts.options.length; i++) {
      java.options.push(opts.options[i]);
    }

    // add jar files
    _.forEach(opts.classpath, function(pattern) {
      var filenames = glob.sync(pattern);
      _.forEach(filenames, function(jarPath) {
        // We prevent duplicates here, since it is easy to do.
        // But duplicates should only happen if class path patterns are somehow redundant.
        if (!_.includes(java.classpath, jarPath))
          java.classpath.push(jarPath);
      });
    });
  }

  dlog('Gremlin configured with classpath:', java.classpath);
  this.java = java;

  var MIN_VALUE = 0;
  var MAX_VALUE = java.newInstanceSync('java.lang.Long', 2147483647);

  this.GremlinTraversal = java.import('com.tinkerpop.gremlin.process.graph.traversal.GraphTraversal');

  this.NULL = java.callStaticMethodSync('org.codehaus.groovy.runtime.NullObject', 'getNullObject');

  var Class = this.Class = java.import('java.lang.Class');
  this.ArrayList = java.import('java.util.ArrayList');
  this.HashMap = java.import('java.util.HashMap');
  this.HashSet = java.import('java.util.HashSet');
//   this.Table = java.import('com.tinkerpop.pipes.util.structures.Table');  // No TK3 equivalent?
//   this.Tree = java.import('com.tinkerpop.pipes.util.structures.Tree');   // TK2
  this.Tree = java.import('com.tinkerpop.gremlin.process.graph.util.Tree');   // TK3, but not used directly

  // This list of allowed function types should mirror the contents of the com.entrendipity.gremlinnode.function
  // package contained in this repo.
  var groovyFunction = 'com.entrendipity.gremlinnode.function.';
  this.GroovyLambda = java.import(groovyFunction + 'GroovyLambda');

  this.ScriptEngineLambda = java.import('com.tinkerpop.gremlin.process.computer.util.ScriptEngineLambda');
  this._groovyScriptEngineName = 'Groovy';
  this._javaScriptEngineName = 'JavaScript';

  this.T = java.import('com.tinkerpop.gremlin.process.T');
  this.Direction = java.import('com.tinkerpop.gremlin.structure.Direction');
  this.Compare = java.import('com.tinkerpop.gremlin.structure.Compare');
  this.Contains = java.import('com.tinkerpop.gremlin.structure.Contains');
  this.ByteArrayOutputStream = java.import('java.io.ByteArrayOutputStream');
  this.UTF8 = java.import('java.nio.charset.StandardCharsets').UTF_8.nameSync();
  this.createGraphSONWriter = java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build').createSync;

  this.emptyArrayList = java.newArray('java.lang.String', []);

  var __ = java.import('com.tinkerpop.gremlin.process.graph.traversal.__');
  this.__ = this.wrapTraversal(__);

  this.ClassTypes = {
    'String': Class.forNameSync('java.lang.String'),
    'Vertex': java.getClassLoader().loadClassSync('com.tinkerpop.gremlin.structure.Vertex'),
    'Edge': java.getClassLoader().loadClassSync('com.tinkerpop.gremlin.structure.Edge'),
    'Byte': Class.forNameSync('java.lang.Byte'),
    'Character': Class.forNameSync('java.lang.Character'),
    'Double': Class.forNameSync('java.lang.Double'),
    'Float': Class.forNameSync('java.lang.Float'),
    'Integer': Class.forNameSync('java.lang.Integer'),
    'Long': Class.forNameSync('java.lang.Long'),
    'Short': Class.forNameSync('java.lang.Short'),
    'Number': Class.forNameSync('java.lang.Number'),
    'BigDecimal': Class.forNameSync('java.math.BigDecimal'),
    'BigInteger': Class.forNameSync('java.math.BigInteger')
  };
};

Gremlin.GraphWrapper = require('./graph-wrapper');
Gremlin.QueryWrapper = require('./query-wrapper');
Gremlin.TraversalWrapper = require('./traversal-wrapper');
Gremlin.ElementWrapper = require('./element-wrapper');
Gremlin.VertexWrapper = require('./vertex-wrapper');
Gremlin.EdgeWrapper = require('./edge-wrapper');
Gremlin.PathWrapper = require('./path-wrapper');

Gremlin.prototype.isType = function (o, typeName) {
  if (!o || !_.isObject(o)) return false;
  if (!o._isType) {
    o._isType = {};
  }
  var res = o._isType[typeName];
  if (res === undefined) {
    try {
      res = this.java.instanceOf(o, typeName);
    } catch (err) {
      res = false;
    }
    o._isType[typeName] = res;
  }
  return res;
};

Gremlin.prototype.toList = function (obj, callback) {
  var promise;
  if (_.isArray(obj)) {
    var list = new this.ArrayList();
    for (var i = 0; i < obj.length; i++) {
      list.addSync(obj[i]);
    }
    promise = new Q(list);
  }
  else if (obj.getClassSync().isArraySync()) {
    promise = Q.nbind(this.java.callStaticMethod, this.java)('java.util.Arrays', 'asList', obj);
  }
  else {
    promise = Q.nbind(this.java.callStaticMethod, this.java)('com.google.common.collect.Lists', 'newArrayList', obj);
  }

  return promise.nodeify(callback);
};

Gremlin.prototype.toListSync = function (obj) {
  if (_.isArray(obj)) {
    var list = new this.ArrayList();
    for (var i = 0; i < obj.length; i++) {
      list.addSync(obj[i]);
    }
    return list;
  }
  if (obj.getClassSync().isArraySync()) {
    return this.java.callStaticMethodSync('java.util.Arrays', 'asList', obj);
  }
  return this.java.callStaticMethodSync('com.google.common.collect.Lists', 'newArrayList', obj);
};

Gremlin.prototype.getEngine = function () {
  if (this._engine) {
    return this._engine;
  }
  var GremlinGroovyScriptEngine = this.java.import('com.tinkerpop.gremlin.groovy.jsr223.GremlinGroovyScriptEngine');
  this._engine = new GremlinGroovyScriptEngine();
  return this._engine;
};

Gremlin.prototype.wrap = function (val) {
  return new GraphWrapper(this, val);
};

Gremlin.prototype.wrapQuery = function (val) {
  return new QueryWrapper(this, val);
};

Gremlin.prototype.wrapTraversal = function (val) {
  return new TraversalWrapper(this, val);
};

Gremlin.prototype.wrapVertex = function (val) {
  return new VertexWrapper(this, val);
};

Gremlin.prototype.wrapEdge = function (val) {
  return new EdgeWrapper(this, val);
};

Gremlin.prototype.wrapPath = function (val) {
  return new PathWrapper(this, val);
};

Gremlin.prototype.extractArguments = function (args) {
  var callback = _.last(args);

  if (_.isFunction(callback))
    args = _.initial(args);
  else
    callback = undefined;

  if (args.length === 1 && _.isArray(args[0]))
    args = args[0];

  return {
    args: args,
    callback: callback
  };
};

// Various TP3 methods such as Graph.addVertex, Vertex.addEdge, and Traversal.addE take
// a final argument Object... propertyKeyValues. For Javacript it is convenient to pass
// a simple Javascript object { key1: value1, key2: value2, ... }.
// This function converts such an object to the java Object[] array.
// *props* is the Javascript object.
// *type* is a java class path, which defaults to java.lang.Object.
Gremlin.prototype.propertiesToVarArgs = function (props, type) {
  props = props || {};
  type = type || 'java.lang.Object';
  return this.java.newArray(type, _.flatten(_.sortBy(_.pairs(props), function (x) { return x[0]; })));
};

// Applies *process* to each item returned by the *javaIterator*.
// *javaIterator* may be a java.util.iterator, or an IteratorWrapper, or a TraversalWrapper,
// or any type that type that implements hasNext() and next() as methods returning promises,
// with the semantics of those methods of java.util.iterator.
// *process* is function(item) {}, and may be either a synchronous function or async function returning a promise.
// Each item is processed completely before the next item is retrieved.
// Returns a promise if callback is omitted, else calls callback asynchronously when all items processed.
Gremlin.prototype.forEach = function (javaIterator, process, callback) {
  function _eachIterator(javaIterator, promisedProcess) {
    return javaIterator.hasNext()
      .then(function (hasNext) {
        if (!hasNext)
          return null;
        return promisedProcess(javaIterator.next())
          .then(function () {
            return _eachIterator(javaIterator, promisedProcess);
          });
      });
  }

  if (_.isUndefined(javaIterator.unwrap)) {
    if (this.java.instanceOf(javaIterator, 'java.util.Iterator'))
      javaIterator = new IteratorWrapper(javaIterator);
  }

  return _eachIterator(javaIterator, Q.promised(process)).nodeify(callback);
};

// Generates a general purpose Groovy lambda that can be used anywhere lambdas are accepted (e.g. filter, map, choose,
// etc.)
Gremlin.prototype.newGroovyLambda = function (groovy) {
  return new this.GroovyLambda(groovy, this.getEngine());
};

// Import a Java class or package into the Groovy engine.
// - *javaClassOrPkg* can be either class name, e.g. 'java.util.HashSet', or package spec, e.g. 'java.util.*'.
Gremlin.prototype.importGroovy = function (javaClassOrPkg) {
  var engine = this.getEngine();
  var imports = new this.HashSet();
  imports.addSync('import ' + javaClassOrPkg);
  engine.addImportsSync(imports);
};

// Generates a general purpose JavaScript lambda that can be used anywhere lambdas are accepted (e.g. filter, map,
// choose, etc.)
Gremlin.prototype.newJavaScriptLambda = function (javascript) {
  return new this.ScriptEngineLambda(this._javaScriptEngineName, javascript);
};

Gremlin.prototype._parseVarargs = function (args, type) {
  var va, self = this;
  if (_.isArray(args[args.length - 1])) {
    va = args.pop();
  } else {
    va = [];
    // HACK - instead of actually converting JS strings -> java.lang.String
    // instances as part of javify, we check the type with _isString
    var test = type === 'java.lang.String' ? _.isString : function (o) {
      return self.isType(o, type);
    };
    while (test(args[args.length - 1])) {
      va.unshift(args.pop());
    }
  }
  args.push(this.java.newArray(type, va));
};

Gremlin.prototype._isClosure = function (val) {
  var closureRegex = /^\{.*\}$/;
  return _.isString(val) && val.search(closureRegex) > -1;
};

Gremlin.prototype._toGroovyLambda = function (groovyClosureString) {
  var self = this;
  assert.ok(self._isClosure(groovyClosureString));
  var lambda = self.newGroovyLambda(groovyClosureString);
  return lambda;
};

Gremlin.prototype._toGroovyLambdas = function (groovyClosureStrings) {
  var self = this;
  var lambdas = groovyClosureStrings.map(function (groovy) {
    return self._toGroovyLambda(groovy);
  });

  // Put them in a Java array of GroovyLambda type.
  var className = this.GroovyLambda.class.getNameSync();
  var javaArray = this.java.newArray(className, lambdas);
  return javaArray;
};

Gremlin.prototype._javify = function (arg) {
  if (arg.unwrap) {
    return arg.unwrap();
  } else if (this._isClosure(arg)) {
    // Turn something that looks like a Groovy closure into a GroovyLambda, which implements a variety of function
    // interfaces.
    var lambda = this._toGroovyLambda(arg);
    return lambda;
  }
  return arg;
};

Gremlin.prototype._jsify = function (arg) {
  if (!_.isObject(arg)) {
    return arg;
  }

  if (!arg._isType) {
    arg._isType = {};
  }

  if (arg.longValue) {
    arg._isType.longValue = true;
    return parseInt(arg.longValue, 10);
  } else if (this.isType(arg, 'com.tinkerpop.gremlin.structure.Vertex')) {
    return this.wrapVertex(arg);
  } else if (this.isType(arg, 'com.tinkerpop.gremlin.structure.Edge')) {
    return this.wrapEdge(arg);
  } else if (this.isType(arg, 'java.util.List')) {
    var arr = [];
    var it = arg.iteratorSync();
    while (it.hasNextSync()) {
      var elem = it.nextSync();
      var obj = this._jsify(elem);
      arr.push(obj);
    }
    return arr;
  } else if (this.isType(arg, 'java.util.Map')) {
    // it seems this type of coercion could be ported to node-java
    // https://github.com/joeferner/node-java/issues/56
    var map = {};
    var it = arg.entrySetSync().iteratorSync();
    while (it.hasNextSync()) {
      var pair = it.nextSync();
      map[pair.getKeySync()] = this._jsify(pair.getValueSync());
    }
    return map;
  } else if (this.isType(arg, 'com.tinkerpop.gremlin.process.util.BulkSet')) {
    var arr = [];
    var it = arg.iteratorSync();
    while (it.hasNextSync()) {
      var key = it.nextSync();
      var count = this._jsify(arg.getSync(key));
      var obj = {
        key: this._jsify(key),
        count: count
      };
      arr.push(obj);
    }
    return arr;
  } else if (this.isType(arg, 'com.tinkerpop.gremlin.process.Path')) {
    return this.wrapPath(arg);
  } else if (this.isType(arg, 'com.tinkerpop.gremlin.structure.Graph')) {
    return this.wrap(arg);
  } else if (this.isType(arg, 'java.lang.Object')) {
    return arg;
  }
  return arg;
};

Gremlin.prototype._asJSON = function (elem) {
  var self = this;
  var java = this.java;
  if (!_.isObject(elem)) {
    // Scalars should stay that way.
    return elem;

  } else if (_.isArray(elem)) {
    // Arrays must be recursively converted.
    return elem.map(function (e) { return self._asJSON(e); });

  } else if (java.instanceOf(elem, 'java.lang.Object')) {
    // If we still have an unrecognized Java object, convert it to a string.
    return {'javaClass': elem.getClassSync().getNameSync(), 'toString': elem.toStringSync()};

  } else if ('toJSON' in elem) {
    // If we have a 'toJSON' method, use it.
    return elem;

  } else {
    // Recursively convert any other kind of object.
    var json = {};
    _.forEach(elem, function (value, key) {
      json[key] = self._asJSON(value);
    });
    return json;
  }
};
