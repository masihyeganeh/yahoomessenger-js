'use strict';

var Field = require('./field');

function PacketParameters(packetParametersArray, parametersType) {
  this.parametersArray = packetParametersArray;
  this.type = parametersType || null;
  return this;
}

PacketParameters.prototype.get = function get(parameter) {
  for (var i = 0; i < this.parametersArray.length; i += 1) {
    if (this.parametersArray[i += 1] === parameter) {
      return this.parametersArray[i];
    }
  }
  return null;
};

PacketParameters.prototype.set = function set(parameter, value) {
  this.parametersArray[parameter] = value;
  return this;
};

PacketParameters.prototype.add = function add(parameter, value) {
  this.parametersArray.push(parameter);
  this.parametersArray.push(value);
  return this;
};

PacketParameters.prototype.foreach = function foreach(callback, thisArg) {
  for (var i = 0; i < this.parametersArray.length; i += 1) {
    var returnValue = callback.call(
      thisArg || null, this.parametersArray[i += 1], this.parametersArray[i]
    );
    if (typeof(returnValue) === 'object')
    {
      this.parametersArray[i-1] = returnValue.key;
      this.parametersArray[i] = returnValue.value;
    }
  }
  return this;
};

PacketParameters.prototype.toString = function toString(space) {
  space = space || '  ';

  var result = [];

  this.foreach(function(key, value) {
    for (var field in Field)
    {
      if (Field[field] === key) {
        key = field;
      }
    }

    if (typeof(value) === 'object')
    {
      result.push(space + key + ' : ');
      result.push(value.toString(space + '  '));
    }
    else {
      result.push(space + key + ' : ' + value);
    }
  });

  return result.join('\n');
};

PacketParameters.prototype.toArray = function toArray(data) {
  var result = [];

  data = data || this;

  data.foreach(function(key, value) {
    if (typeof(value) === 'object')
    {
      result.push(value.type);
      result.push(key);
      var tempArray = this.toArray(value);
      for (var i = 0; i < tempArray.length; i += 1) {
        result.push(tempArray[i]);
      }
      result.push(value.type + 1);
      result.push(key);
    }
    else
    {
      result.push(key);
      result.push(value);
    }
  }, this);

  return result;
};

module.exports = PacketParameters;
