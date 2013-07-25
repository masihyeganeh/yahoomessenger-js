'use strict';

var Util           = require('../lib/util');
var Field          = require('../lib/field');
var Packet         = require('../lib/packet');
var Service        = require('../lib/service');
var PacketCapturer = require('./packetcapturer');

PacketCapturer = new PacketCapturer();

var stackBuffer = new Buffer(0);

function handlePackets(data, callback) {
  var packet = null;

  //if (data.readUInt32BE(0) == 0x594D5347) return;

  data = Buffer.concat([stackBuffer, data]);
  stackBuffer = new Buffer(0);

  var packetSize = data.readUInt16BE(8);
  packetSize += 20;

  if (packetSize > data.length) {
    stackBuffer = data;
  }
  else if (packetSize === data.length) {
    packet = (new Packet()).parsePacket(data);
  }
  else
  {
    packet = (new Packet()).parsePacket(data.slice(0, packetSize));
    //if (data.readUInt8(packetSize) == 0x00) packetSize += 1;
    handlePackets(data.slice(packetSize), callback);
  }

  if (packet !== null) {
    callback(packet.service, packet.fields, packet);
  }
}

function handleIncomingPacket(service, fields, packet) {
  var method = '';
  var known = false;

  for (var item in Service) {
    if (Service[item] === service) {
      known = true;
      method = Util.lowerCamelCase(item);
      break;
    }
  }

  if (known)
  {
    var code = '';
    code += 'module.exports.' + method + ' = function ' + method + '(fields) {';
    var returningObject = [];
    fields.foreach(function (key, value) {
      for (var field in Field)
      {
        if (Field[field] === key) {
          key = field;
        }
      }
      code += '\n  var ' + Util.lowerCamelCase(key) + ' = ' +
              'fields.get(Field.' + key + '); // Value : ' + value;
      returningObject.push('\n    \'' +
        key.toString().toLowerCase() + '\': ' + Util.lowerCamelCase(key)
      );
    });
    code += '\n';
    code += '\n  this.fireEvent(\'' + method + '\', {';
    code += returningObject.join(',');
    code += '\n  });';
    code += '\n};';
    code += '\n';

    console.log(code);

  } else {
    console.log(packet.toString());
    console.log();
  }
}


function handleOutgoingPacket(service, fields, packet) {
  var method = '';
  var known = false;

  for (var item in Service) {
    if (Service[item] === service) {
      known = true;
      method = item;
      break;
    }
  }

  if (known)
  {
    var code = '';
    var functionArguments = [];
    fields.foreach(function (key, value) {
      for (var field in Field)
      {
        if (Field[field] === key) {
          key = field;
        }
      }
      if (typeof value === 'object') {
        code += '\n    .add(Field.' + key + ', new PacketParameters([';
        // TODO : Don't be lazy! recursively print it beautifully
        code += '\n      ' + value.toArray().toString();
        code += '\n    ], ' + value.type + '))';
      } else {
        code += '\n    .add(Field.' + key + ', \'' + value + '\')';
      }
      functionArguments.push(Util.lowerCamelCase(key));
    });
    code = 'module.exports.' + Util.lowerCamelCase(method) + ' = function ' +
            Util.lowerCamelCase(method) + '(' + functionArguments.join(', ') +
            ') {' + '\n  var packet = this.newPacket(Service.' + method + ');' +
            '\n  packet.fields' + code;
    code += ';\n  this.sendPacket(packet);';
    code += '\n  return this;';
    code += '\n};';
    code += '\n';

    console.log(code);

  } else {
    console.log(packet.toString());
    console.log();
  }
}

PacketCapturer.on('send', function onPacketSend(packet) {
  /*
  if (Util.bufferIndexOf(packet, 'YMSG' + String.fromCharCode(0)) === -1) {
    console.log(
      'Packet sent from ' + info.srcaddr + ':' + info.srcport + ' to ' +
      info.dstaddr + ':' + info.dstport + ' with ' + info.nbytes +
      ' bytes length, truncated? ' + (info.trunc ? 'yes' : 'no')
    );
    console.log(packet.toString('binary'));
    console.log();
    return;
  }
  */
  if (packet && packet.length >= 20) {
    handlePackets(packet, handleOutgoingPacket);
  }
});

PacketCapturer.on('receive', function onPacketReceive(packet) {
  /*
  if (Util.bufferIndexOf(packet, 'YMSG' + String.fromCharCode(0)) === -1) {
    console.log(
      'Packet received from ' + info.srcaddr + ':' + info.srcport + ' to ' +
      info.dstaddr + ':' + info.dstport + ' with ' + info.nbytes +
      ' bytes length, truncated? ' + (info.trunc ? 'yes' : 'no')
    );
    console.log(packet.toString('binary'));
    console.log();
    return;
  }
  */
  if (packet && packet.length >= 20) {
    handlePackets(packet, handleIncomingPacket);
  }
});

PacketCapturer.capture('192.168.1.101', 5050);
