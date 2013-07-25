var Cap          = require('cap').Cap;
var decoders     = require('cap').decoders;
var PROTOCOL     = decoders.PROTOCOL;
var EventEmitter = require('events').EventEmitter;

function PacketCapturer() {
  // Make sure we call our parents constructor
  EventEmitter.call(this);

  this.devices = {};

  return this;
}

// The PacketCapturer emits events!
PacketCapturer.prototype = Object.create(EventEmitter.prototype);

PacketCapturer.prototype.getDeviceList = function getDeviceList() {
  this.devices = Cap.deviceList();
  return this.devices;
}

PacketCapturer.prototype.capture = function capture(sourceIP, destinationPort) {
  var me = this;

  if (typeof destinationPort === 'undefined') {
    destinationPort = '5050';
  }

  var c = new Cap();
  var device = Cap.findDevice(sourceIP);
  var filter = 'tcp and src port ' + destinationPort.toString() + ' or dst port ' + destinationPort.toString();
  var bufSize = 10 * 1024 * 1024;
  var buffer = new Buffer(65535);
  var linkType = c.open(device, filter, bufSize, buffer);

  if (c.setMinBytes) {
    c.setMinBytes(0);
  }
  c.on('packet', function(nbytes, trunc) {
    var info = {};
    info.nbytes = nbytes;
    info.trunc = trunc;

    if (linkType === 'ETHERNET') {
      var ret = decoders.Ethernet(buffer);

      if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
        ret = decoders.IPV4(buffer, ret.offset);
        var srcaddr = ret.info.srcaddr;
        var dstaddr = ret.info.dstaddr;
        var datalen;

        if (ret.info.protocol === PROTOCOL.IP.TCP) {
          datalen = ret.info.totallen - ret.hdrlen;
          ret = decoders.TCP(buffer, ret.offset);
          datalen -= ret.hdrlen;
        } else if (ret.info.protocol === PROTOCOL.IP.UDP) {
          ret = decoders.UDP(buffer, ret.offset);
          datalen = ret.info.length;
        }

        info.srcaddr = srcaddr;
        info.srcport = ret.info.srcport;
        info.dstaddr = dstaddr;
        info.dstport = ret.info.dstport;

        var eventName = (info.srcaddr == sourceIP ? 'send' : 'receive');

        me.emit(eventName, buffer.slice(ret.offset, ret.offset + datalen), info);
      }
    }
  });
}

module.exports = PacketCapturer;
