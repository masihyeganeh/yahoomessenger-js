'use strict';

var Service      = require('./service');
var RequireAll   = require('require-all');
var Connection   = require('./connection');
var EventEmitter = require('events').EventEmitter;

function upperCamelCase(value) {
  var pattern = /^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g;
  value = value.replace(/[-_]+/g, ' ').toLowerCase();
  value = value.replace(pattern, function ($1) {
      return $1.toUpperCase();
    }).replace(/\s+/g, '');
  return value;
}
/*
function lowerCamelCase(value) {
  value = upperCamelCase(value);
  value = value.charAt(0).toLowerCase() + value.slice(1);
  return value;
}
*/
function Messenger() {
  var me = this;

  // Make sure we call our parents constructor
  EventEmitter.call(this);

  me.MESSENGER_VERSION = '11.5.0.228';

  me.sessionData = {
    userData: {
      username: '',
      password: '',
      sessionID: '',
      crumb: '',
      crumbHash: '',
      cookies: {
        Y: '',
        T: '',
        B: ''
      }
    },
    isInvisible: false,
    friendsList: {},
    connection: (new Connection())
  };

  return me;
}

// The Messenger emits events!
Messenger.prototype = Object.create(EventEmitter.prototype);

Messenger.prototype.parse = {};

var fileName;
var file;
var property;
var processors;

processors = new RequireAll({
  dirname: __dirname + '/incoming',
  filter: /(.+)\.js$/,
});

for (fileName in processors) {
  file = processors[fileName];
  for (property in file) {
    Messenger.prototype.parse['on'+upperCamelCase(property)] = file[property];
  }
}

processors = new RequireAll({
  dirname: __dirname + '/outgoing',
  filter: /(.+)\.js$/,
});

for (fileName in processors) {
  file = processors[fileName];
  for (property in file) {
    Messenger.prototype[property] = file[property];
    /* // It's maybe a workaround if outgoing call fails
    Messenger[property] = function () {
      file[property].apply(Messenger, arguments);
    }
    */
  }
}

Messenger.prototype.newInstance = function newInstance() {
  var me = this;

  me.sessionData = {
    userData: {
      username: '',
      password: '',
      sessionID: '',
      crumb: '',
      crumbHash: '',
      cookies: {
        Y: '',
        T: '',
        B: ''
      }
    },
    isInvisible: false,
    friendsList: {},
    connection: {}
  };

  function onConnection(ip, port) {
    me.emit('ready', {
      ip: ip,
      port: port
    });
  }

  function onConnectionDataReceive(service, fields, packet) {
    var method = '';
    var known = false;

    for (var item in Service) {
      if (Service[item] === service) {
        known = true;
        method = ('on' + upperCamelCase(item));
        break;
      }
    }

    if (known && me.parse[method])
    {
      me.parse[method].call(me, fields, packet);
    } else {
      me.emit('debug', packet.toString()); // Unhandeled Packets
    }
  }

  me.sessionData.connection = new Connection();
  me.sessionData.connection.connect();
  me.sessionData.connection.on('connect', onConnection);
  me.sessionData.connection.on('error', function (e) {
    throw e;
  });
  me.sessionData.connection.on('receive', onConnectionDataReceive);
};

Messenger.prototype.fireEvent = function fireEvent(event, data) {
  if (typeof data === 'undefined') {
    data = {};
  }

  data.user_id = this.sessionData.userData.username;

  this.emit(event, data);
  // Also emit a general event for debug purpose
  this.emit('event', {
    'event': event,
    'data': data
  });

  return this;
};

module.exports = (new Messenger()); // singleton
