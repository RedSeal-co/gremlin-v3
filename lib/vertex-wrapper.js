'use strict';

var util = require('util');
var ElementWrapper = require('./element-wrapper');
var Q = require('q');
var _ = require('lodash');
var assert = require('assert');   // TODO: remove

var VertexWrapper = module.exports = function (gremlin, el) {
  ElementWrapper.call(this, gremlin, el);
};

util.inherits(VertexWrapper, ElementWrapper);

// public Iterable<Edge> getEdges(Direction direction, String... labels);
// public Iterable<Vertex> getVertices(Direction direction, String... labels);
// public VertexQuery query();
// public Edge addEdge(String label, Vertex inVertex);

VertexWrapper.prototype.addEdge = function (label, inVertex, properties, callback) {
  // TinkerPop3 changed the API for addEdge() from that used in TinkerPop2.
  // We currently use asserts to detect cases where addEdge is called with the TP2 API.
  var self = this;
  assert(_.isObject(properties));
  assert(inVertex instanceof VertexWrapper);
  return Q.nbind(self.el.addEdge, self.el)(label, inVertex.unwrap(), self.gremlin.propertiesToVarArgs(properties))
    .then(function (e) { return self.gremlin.wrapEdge(e); })
    .nodeify(callback);
};

VertexWrapper.prototype.setProperty = function (key, value, callback) {
  return Q.nbind(this.el.singleProperty, this.el)(key, value).nodeify(callback);
};

VertexWrapper.simplifyVertexProperties = function (obj) {
  // Given *obj* which is a javascript object created by VertexWrapper.prototype.toJSON(),
  // return a simpler representation of the object that is more convenient for unit tests.

  if (_.isArray(obj)) {
    return _.map(obj, VertexWrapper.simplifyVertexProperties);
  }

  obj.properties = _.mapValues(obj.properties, function (propValue) {
    var values = _.pluck(propValue, 'value');
    return (values.length === 1) ? values[0] : values;
  });
  return obj;
};

VertexWrapper.prototype.jsonStringifySync = function () {
  // Return a json-formatted string (synchronously) for this vertex.
  var stream = new this.gremlin.ByteArrayOutputStream();
  var builder = this.gremlin.java.callStaticMethodSync('com.tinkerpop.gremlin.structure.io.graphson.GraphSONWriter', 'build');
  var writer = builder.createSync();
  writer.writeVertexSync(stream, this.unwrap());
  return stream.toStringSync(this.gremlin.UTF8);
};

VertexWrapper.prototype.toJSON = function () {
  return JSON.parse(this.jsonStringifySync());
};
