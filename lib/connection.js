'use strict';

var net          = require('net');
var http         = require('http');
var Packet       = require('./packet');
var EventEmitter = require('events').EventEmitter;

function Connection() {
  var me = this;

  // Make sure we call our parents constructor
  EventEmitter.call(this);

  this.socket      = {};
  this.ip          = '98.136.48.70'; // Default IP
  this.port        = 5050; // 5050 or 23
  this.stackBuffer = (new Buffer(0));

  function tryToConnect() {
    return net.connect(me.port, me.ip, function tryToConnectOnConnect() {
      me.emit('connect', me.ip, me.port);
      //me.socket.write((new Packet(76)).toBuffer()); // Service.SEND_PORT_CHECK
    }).on('data', function tryToConnectOnData(data) {
      me.handlePackets(data);
    }).on('end', function tryToConnectOnEnd() {
      me.emit('end');
    }).on('error', function tryToConnectOnError(data) {
      throw data;
    });
  }

  function connConnectOnData(chunk) {
    if (chunk.length)
    {
      var ip = (chunk.toString().split('CS_IP_ADDRESS=')[1]).trim();
      if (ip && ip.length) {
        me.ip = ip;
      }
    }

    me.socket = tryToConnect();
    me.socket.setKeepAlive(true);
  }

  function connConnectOnError(e) {
    me.emit('error', 'Error in getting IP: ' + e.message);

    me.socket = tryToConnect();
    me.socket.setKeepAlive(true);
  }

  this.connect = function connect() {
    // http://[scs-vcs1-vcs2].msg.yahoo.com/capacity
    http.get('http://vcs1.msg.yahoo.com/capacity', function connConnect(res) {
      res.on('data', connConnectOnData).on('error', connConnectOnError);
    }).on('error', connConnectOnError);
  };

  return this;
}

// The Connection emits events!
Connection.prototype = Object.create(EventEmitter.prototype);

Connection.prototype.handlePackets = function handlePackets(data) {
  var packet = null;

  //if (data.readUInt32BE(0) == 0x594D5347) return;

  data = Buffer.concat([this.stackBuffer, data]);
  this.stackBuffer = new Buffer(0);

  var packetSize = data.readUInt16BE(8);
  packetSize += 20;

  if (packetSize > data.length) {
    this.stackBuffer = data;
  }
  else if (packetSize === data.length) {
    packet = (new Packet()).parsePacket(data);
  }
  else
  {
    packet = (new Packet()).parsePacket(data.slice(0, packetSize));
    //if (data.readUInt8(packetSize) == 0x00) packetSize += 1;
    this.handlePackets(data.slice(packetSize));
  }

  if (packet !== null) {
    this.emit('receive', packet.service, packet.fields, packet);
  }

  return this;
};

Connection.prototype.send = function send(packet) {
  if (typeof this.socket.write === 'undefined') {
    this.emit('error', 'Socket is not connected yet');
  }
  else {
    this.socket.write(packet.toBuffer());
  }

  return this;
};

Connection.prototype.close = function close() {
  if (typeof this.socket.write === 'undefined') {
    this.emit('error', 'Socket is not connected yet');
  }
  else {
    this.socket.end();
  }
};

module.exports = Connection;
