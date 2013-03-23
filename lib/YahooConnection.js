var net = require('net'),
	http = require('http'),
	https = require('https'),
	crypto = require('crypto'),
	Packet = require('./Packet');

var YahooConnection = (function YahooConnection() {

	return {

		handlePackets: function(data) {

			var packet = null;

			//if (data.readUInt32BE(0) == 0x594D5347) return;
			
			data = Buffer.concat([this.stackBuffer, data]);
			this.stackBuffer = new Buffer(0);

			var packetSize = data.readUInt16BE(8);
			packetSize += 20;

			if (packetSize > data.length)
				this.stackBuffer = data;
			else if (packetSize == data.length)
				packet = (new Packet()).ParsePacket(data);
			else
			{
				packet = (new Packet()).ParsePacket(data.slice(0, packetSize));

				//if (data.readUInt8(packetSize) == 0x00) packetSize++;

				this.handlePackets(data.slice(packetSize));
			}

			if (packet !== null)
				this.events.emit('receive', packet.service, packet.fields, packet);

		},

		send: function(packet) {
			if (typeof this.socket.write === 'undefined')
				this.events.emit('error', "Socket is not connected yet");
			else
				this.socket.write(packet.toBuffer());
		},

		close: function() {
			if (typeof this.socket.write === 'undefined')
				this.events.emit('error', "Socket is not connected yet");
			else
				this.socket.end();
		}

	};

})();

module.exports = function() {
	return Object.create(YahooConnection, (function(){

		var sessionID = 0x00;
		
		return {

			connect:  {
				writable: false,
				configurable: true,
				enumerable: false,
				value: function () {

					var me = this;

					var tryToConnect = function(){

						return net.connect(me.PORT, me.IP, function() {

							me.events.emit('connect', me.IP, me.PORT);
							//me.socket.write((new Packet(76)).toBuffer()); // Service.SEND_PORT_CHECK

						}).on('data', function(data) {

							me.handlePackets(data);

						} ).on('end', function() {

							me.events.emit('end');

						}).on('error', function(data) {

							me.events.emit('error', data);

						});
					};
	
					http.get('http://vcs2.msg.yahoo.com/capacity', function(res) { // http://[scs-vcs1-vcs2].msg.yahoo.com/capacity

						

						res.on("data", function(chunk) {
							if (chunk.length)
							{
								var ip = (chunk.toString().split('CS_IP_ADDRESS=')[1]).trim();

								if (ip && ip.length)
									me.IP = ip;
							}

							me.socket = tryToConnect();
							me.socket.setKeepAlive(true);
						});

						

					}).on('error', function(e) {

						me.events.emit('error', "Error in getting IP: " + e.message);

						me.socket = tryToConnect();
						me.socket.setKeepAlive(true);

					});

				}
			},

			socket:  {
				writable: true,
				configurable: false,
				enumerable: false,
				value: {}
			},

			IP:  {
				writable: true,
				configurable: false,
				enumerable: true,
				value: '98.136.48.70' // Default IP
			},

			PORT:  {
				writable: true,
				configurable: false,
				enumerable: true,
				value: 5050 // 5050 or 23
			},

			stackBuffer:  {
				writable: true,
				configurable: false,
				enumerable: false,
				value: (new Buffer(0))
			},

			events:  {
				writable: false,
				configurable: false,
				enumerable: false,
				value: new (require('events').EventEmitter)()
			}

		};

	})());
};