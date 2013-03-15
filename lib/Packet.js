var Service = require('./Service'),
	PacketParameters = require('./PacketParameters');

var Packet = (function Packet() {

	var Obj = {

		delimiter: new Buffer(2),

		ParsePacket: function(data) {
			if (data.length < 20) return;

			this.raw_packet_header = data.slice(0, 20); // I have no idea why i save this :)

			var ServiceID = data.readUInt16BE(10);

			if (ServiceID == 87)
				this.sessionID = data.readUInt32BE(32);

			data = data.slice(20).toString('utf8').split(this.delimiter);

			if (data.length % 2 !== 0)
				data = data.slice(0, data.length - 1);

			for(var i=0; i < data.length; i++)
			{
				if (data[i] && (i % 2 === 0))
					data[i] = parseInt(data[i], 10);
			}

			data = this.parseNestedParameters(data);

			this.service = ServiceID;
			this.fields = data;
			data = undefined;

			return this;
		},

		parseNestedParameters: function(data, type)
		{
			var list_start_index = [],
				record_start_index = [];

			for (var i=0; i < data.length; i+=2)
			{
				switch (data[i])
				{
					case 300: // Field.START_OF_RECORD

						data[i++] = parseInt(data[i], 10);
						record_start_index.push(i--);
						break;

					case 301: // Field.END_OF_RECORD

						var current_record_start_index = record_start_index.pop();
						data = [].concat(
							data.slice(0, current_record_start_index),
							[this.parseNestedParameters(data.slice(current_record_start_index+1, i), 300)], // 300 = Field.START_OF_RECORD
							data.slice(i+2)
						);

						i = current_record_start_index-1;
						break;

					case 302: // Field.START_OF_LIST

						data[i++] = parseInt(data[i], 10);
						list_start_index.push(i--);
						break;

					case 303: // Field.END_OF_LIST

						var current_list_start_index = list_start_index.pop();
						data = [].concat(
							data.slice(0, current_list_start_index),
							[this.parseNestedParameters(data.slice(current_list_start_index+1, i), 302)], // 302 = Field.START_OF_LIST
							data.slice(i+2)
						);

						i = current_list_start_index-1;
						break;
				}
			}

			var result = new PacketParameters(data, type);

			data = undefined;

			return result;
		},

		toString: function() {
			var result = '';

			var known = false;
			for(var item in Service)
			{
				if (Service[item] == this.service)
				{
					known = true;
					result += ("[" + item + " (" + this.service.toString() + ") Received]");
				}
			}
			if (known === false)
				result += ("[ Received : " + this.service.toString() + " ] :");

			result += ("\r\n{\r\n");
			result += (this.fields.toString('    '));
			result += ("\r\n}");

			return result;
		},

		toBuffer: function() {
			var packet = new Buffer(5 * 1024); // long enough size to store all of our data
			var packetLength = 0;
			var parameters = this.fields.toArray();

			for(var i = 0; i < parameters.length; i++)
			{
				var dataToWrite = (parameters[i]).toString();
				packet.write(dataToWrite, packetLength);
				packetLength += dataToWrite.length;

				packet.writeUInt16BE(0xC080, packetLength);
				packetLength += 2;
			}

			this.raw_packet_header.writeUInt16BE(packetLength, 8);

			return Buffer.concat([this.raw_packet_header, packet.slice(0, packetLength)]);
		}

	};

	(function(){

		Obj.delimiter.writeUInt16BE(0xC080, 0);

	})();

	return Obj;

})();

module.exports = function(ServiceID, UserStatus, SessionID) {
	return Object.create(Packet, (function(ServiceID, UserStatus, SessionID){

		var ProtocolVersion = 19; // Protocol of Yahoo! Messengr 11.5.0.228 is 19

		var Obj = {

			raw_packet_header:  {
				writable: false,
				configurable: false,
				enumerable: false,
				value: new Buffer(20)
			},

			sessionID:  {
				writable: true,
				configurable: false,
				enumerable: false,
				value: 0
			},

			service:  {
				writable: true,
				configurable: false,
				enumerable: false,
				value: 0
			},

			fields:  {
				writable: true,
				configurable: false,
				enumerable: false,
				value: new PacketParameters([])
			}

		};

		(function(ServiceID, UserStatus, SessionID){

			Obj.service.value = ServiceID || 0x00;

			Obj.raw_packet_header.value.write('YMSG');
			Obj.raw_packet_header.value.writeUInt16BE(ProtocolVersion, 4);			// Protocol Version
			Obj.raw_packet_header.value.writeUInt16BE(0, 6);
			Obj.raw_packet_header.value.writeUInt16BE(0, 8);						// Packet Payload Length
			Obj.raw_packet_header.value.writeUInt16BE(Obj.service.value, 10);		// Service ID
			Obj.raw_packet_header.value.writeUInt32BE((UserStatus || 0x00), 12);	// Consts.UserStatus
			Obj.raw_packet_header.value.writeUInt32BE(SessionID || 0x00, 16);		// SessionID

		})(ServiceID, UserStatus, SessionID);

		return Obj;

	})(ServiceID, UserStatus, SessionID));
};