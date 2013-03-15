var Field = require('./Field');

var PacketParameters = (function PacketParameters() {

	return {

		get: function(parameter) {
			for (var i = 0; i < this.parameters_array.length; i++) {
				if (this.parameters_array[i++] == parameter)
					return this.parameters_array[i];
			}
			return null;
		},
		set: function(parameter, value) {
			this.parameters_array[parameter] = value;
		},
		add: function(parameter, value) {
			this.parameters_array.push(parameter);
			this.parameters_array.push(value);
		},
		foreach: function(callback, thisArg) {
			for (var i = 0; i < this.parameters_array.length; i++) {
				var returnValue = callback.call(thisArg || null, this.parameters_array[i++], this.parameters_array[i]);
				if (typeof(returnValue) == "object")
				{
					this.parameters_array[i-1] = returnValue.key;
					this.parameters_array[i] = returnValue.value;
				}
			}
		},
		toString: function(space) {
			space = space || '    ';

			var result = [];

			this.foreach(function(key, value){
				for(var field in Field)
				{
					if (Field[field] == key)
						key = field;
				}

				if (typeof(value) == "object")
				{
					result.push(space + key + " : ");
					result.push(value.toString(space + '    '));
				}
				else
					result.push(space + key + " : " + value);

			});

			return result.join('\n');
		},
		toArray: function(data)
		{
			var result = [];

			data = data || this;

			data.foreach(function(key, value){
				if (typeof(value) == "object")
				{
					result.push(value.type);
					result.push(key);
					var tempArray = this.toArray(value);
					for (var i = 0; i < tempArray.length; i++)
						result.push(tempArray[i]);
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
		}

	};

})();

module.exports = function(packet_parameters_array, parameters_type) {
	return Object.create(PacketParameters, (function(packet_parameters_array, parameters_type){
		
		return {

			parameters_array:  {
				writable: true,
				configurable: false,
				enumerable: true,
				value: packet_parameters_array
			},

			type:  {
				writable: true,
				configurable: false,
				enumerable: true,
				value: parameters_type || null
			}

		};

	})(packet_parameters_array, parameters_type));
};