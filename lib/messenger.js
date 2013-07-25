'use strict';

var Util         = require('./util');
var Consts       = require('./consts');
var Service      = require('./service');
var RequireAll   = require('require-all');
var Connection   = require('./connection');
var EventEmitter = require('events').EventEmitter;

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
        B: '',
        SSL: ''
      }
    },
    isInvisible: false,
    userStatus: Consts.UserStatus.Available,
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
var propertyName;
var processors;

processors = new RequireAll({
  dirname: __dirname + '/incoming',
  filter: /(.+)\.js$/
});

for (fileName in processors) {
  file = processors[fileName];
  for (property in file) {
    propertyName = 'on' + property.charAt(0).toUpperCase() + property.slice(1);
    Messenger.prototype.parse[propertyName] = file[property];
  }
}

processors = new RequireAll({
  dirname: __dirname + '/outgoing',
  filter: /(.+)\.js$/
});

for (fileName in processors) {
  file = processors[fileName];
  for (property in file) {
    Messenger.prototype[property] = file[property];
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
        B: '',
        SSL: ''
      }
    },
    isInvisible: false,
    userStatus: Consts.UserStatus.Available,
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
        method = ('on' + Util.upperCamelCase(item));
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
