'use strict';

var async = require('async');

var ElementWrapper = module.exports = function (gremlin, el) {
  this.gremlin = gremlin;
  this.el = el;
};

ElementWrapper.prototype.unwrap = function () {
  return this.el;
};

ElementWrapper.prototype.getId = function () {
  return this.el.getIdSync();
};

ElementWrapper.prototype.getProperty = function (key, callback) {
  this.el.getProperty(key, callback);
};

ElementWrapper.prototype.getProperties = function (props, callback) {
  var el = this.el;

  function get(keys) {
    async.each(keys, function (key, cb) {
      el.getProperty(key, cb);
    }, callback);
  }

  if (callback === undefined) {
    callback = props;

    // get all the possible property keys
    this.el.getPropertyKeys(function (err, set) {
      props = [];

      var it = set.iteratorSync();
      while (it.hasNextSync()) {
        props.push(it.nextSync());
      }

      get(props);
    });
  } else {
    get(props);
  }
};

ElementWrapper.prototype.setProperty = function (key, value, callback) {
  this.el.setProperty(key, value, callback);
};

ElementWrapper.prototype.setProperties = function (props, callback) {
  var el = this.el;

  async.each(Object.keys(props), function (key, cb) {
    el.setProperty(key, props[key], cb);
  }, callback);
};

ElementWrapper.prototype.removeProperty = function (key, callback) {
  this.el.removeProperty(key, callback);
};

ElementWrapper.prototype.remove = function (callback) {
  this.el.remove(callback);
};

ElementWrapper.prototype.toJSON = function () {
  return {
    id: this.getId()
  };
};