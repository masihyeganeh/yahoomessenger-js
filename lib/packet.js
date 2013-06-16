'use strict';

var Service          = require('./service');
var PacketParameters = require('./packetparameters');

function Packet(serviceID, userStatus, sessionID) {

  var PROTOCOL_VERSION = 19; // Protocol of Yahoo! Messengr 11.5.0.228 is 19

  this.sessionID = sessionID || 0;
  this.service   = serviceID || 0x00;
  this.fields    = new PacketParameters([]);

  var header = new Buffer(20);
  header.write('YMSG');
  header.writeUInt16BE(PROTOCOL_VERSION, 4);      // Protocol Version
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);                     // Packet Payload Length
  header.writeUInt16BE(this.service, 10);         // Service ID
  header.writeUInt32BE((userStatus || 0x00), 12); // Consts.userStatus
  header.writeUInt32BE(sessionID || 0x00, 16);    // SessionID

  this.rawPacketHeader = header;

  return this;
}

Packet.prototype.delimiter = new Buffer(2);
Packet.prototype.delimiter.writeUInt16BE(0xC080, 0);

Packet.prototype.parsePacket = function parsePacket(data) {
  if (data.length < 20) {
    return;
  }

  this.rawPacketHeader = data.slice(0, 20); // I have no idea why i save this :)

  var serviceID = data.readUInt16BE(10);

  if (serviceID === 87) {
    this.sessionID = data.readUInt32BE(32);
  }

  data = data.slice(20).toString('utf8').split(this.delimiter);

  if (data.length % 2 !== 0) {
    data = data.slice(0, data.length - 1);
  }

  for (var i=0; i < data.length; i += 1) {
    if (data[i] && (i % 2 === 0)) {
      data[i] = parseInt(data[i], 10);
    }
  }

  data = this.parseNestedParameters(data);

  this.service = serviceID;
  this.fields = data;
  data = undefined;

  return this;
};

Packet.prototype.parseNestedParameters =
function parseNestedParameters(data, type) {
  var listStartIndex = [];
  var recordStartIndex = [];

  for (var i=0; i < data.length; i += 2) {
    switch (data[i]) {
    case 300: // Field.START_OF_RECORD
      data[i] = parseInt(data[i += 1], 10);
      recordStartIndex.push(i);
      i -= 1;
      break;

    case 301: // Field.END_OF_RECORD
      var currentRecordStartIndex = recordStartIndex.pop();
      data = [].concat(
        data.slice(0, currentRecordStartIndex),
        [this.parseNestedParameters(
          data.slice(currentRecordStartIndex+1, i),
          300 // 300 = Field.START_OF_RECORD
        )],
        data.slice(i+2)
      );

      i = currentRecordStartIndex-1;
      break;

    case 302: // Field.START_OF_LIST
      data[i] = parseInt(data[i += 1], 10);
      listStartIndex.push(i);
      i -= 1;
      break;

    case 303: // Field.END_OF_LIST
      var currentListStartIndex = listStartIndex.pop();
      data = [].concat(
        data.slice(0, currentListStartIndex),
        [this.parseNestedParameters(
          data.slice(currentListStartIndex+1, i),
          302 // 302 = Field.START_OF_LIST
        )],
        data.slice(i+2)
      );

      i = currentListStartIndex-1;
      break;
    }
  }

  var result = new PacketParameters(data, type);

  data = undefined;

  return result;
};

Packet.prototype.toString = function toString() {
  var result = '';

  var known = false;
  for (var item in Service) {
    if (Service[item] === this.service) {
      known = true;
      result += ('[' + item + ' (' + this.service.toString() + ') Received]');
    }
  }

  if (known === false) {
    result += ('[ Received : ' + this.service.toString() + ' ] :');
  }

  result += '\r\n{\r\n';
  result += this.fields.toString('  ');
  result += '\r\n}';

  return result;
};

Packet.prototype.toBuffer = function toBuffer() {
  var packet = new Buffer(5 * 1024); // long enough to store all of our data
  var packetLength = 0;
  var parameters = this.fields.toArray();

  for (var i = 0; i < parameters.length; i += 1) {
    var dataToWrite = (parameters[i]).toString();
    packet.write(dataToWrite, packetLength);
    packetLength += dataToWrite.length;

    packet.writeUInt16BE(0xC080, packetLength);
    packetLength += 2;
  }

  this.rawPacketHeader.writeUInt16BE(packetLength, 8);

  return Buffer.concat([this.rawPacketHeader, packet.slice(0, packetLength)]);
};

module.exports = Packet;
