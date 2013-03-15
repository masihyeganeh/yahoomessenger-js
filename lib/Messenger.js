var net = require('net'),
	http = require('http'),
	https = require('https'),
	Field = require('./Field'),
	crypto = require('crypto'),
	Consts = require('./Consts'),
	Packet = require('./Packet'),
	Service = require('./Service'),
	PacketParameters = require('./PacketParameters');
	YahooConnection = require('./YahooConnection');

var Messenger = (function Messenger() {

	return {

		MessengerVersion: '11.5.0.228',

		sendPacket: function (packet) {
			packet.sessionID = this.userData.sessionID;
			this.connection.send(packet);
		},

		login: function (username, password) {
			this.userData.username = username;
			this.userData.password = password;

			var packet = new Packet(Service.HELO);
			packet.fields.add(Field.CURRENT_ID, username);
			this.sendPacket(packet);
		},

		keepAlive: function () {
			var packet = new Packet(Service.KEEP_ALIVE);
			packet.fields.add(Field.USER_NAME, this.userData.username);
			this.sendPacket(packet);
		},

		sendTyping: function (targetUser, stillTyping)
		{
			var packet = new Packet(Service.USER_SEND_MESG);
			packet.fields.add(Field.APPNAME, Consts.AppName.TYPING);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.MSG, " ");
			packet.fields.add(Field.FLAG, (stillTyping ? "0" : "1"));
			packet.fields.add(Field.TARGET_USER, TargetUser);
			this.sendPacket(packet);
		},

		// ---- Chat ----
		getChatCategories: function () {
			return ('http://insider.msg.yahoo.com/ycontent/?chatcat'); // TODO : This is an xml file. this should be parsed and return an array
		},
		getChatRooms: function (categoryID) {
			return ('http://insider.msg.yahoo.com/ycontent/?chatroom_' + categoryID); // TODO : This is an xml file. this should be parsed and return an array
		},
		chatLogin: function () {
			var packet = new Packet(Service.CHAT_MSGR_USER_LOGIN);
			packet.fields.add(Field.CHAT_ROOM_USER_NAME, this.userData.username);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.PASSWORD, 'abcde');
			packet.fields.add(Field.COUNTRY_CODE, 'us');
			packet.fields.add(Field.MESSENGER_VERSION, 'ym' + this.MessengerVersion);
			this.sendPacket(packet);
		},

		chatJoin: function (roomID, roomName, captcha) {
			var packet = new Packet(Service.CHAT_ROOM_JOIN);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.CHAT_ROOM_NAME, roomName);
			packet.fields.add(Field.CHAT_ROOM_SPACEID, roomID);
			packet.fields.add(Field.WEBCAM_STATUS, '2'); // TODO : 0 = ? , 1 = Webcam , 2 = No Webcam , >2 = ?

			if (typeof captcha  !== "undefined")
			{
				packet.fields.add(Field.CHAT_MSG_TYPE, '1');
				packet.fields.add(Field.CHAT_MSG, captcha);
			}

			this.sendPacket(packet);
		},

		sendPublicChatMessage: function (roomName, message)
		{
			var packet = new Packet(Service.CHAT_ROOM_JOIN);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.CHAT_ROOM_NAME, roomName);
			packet.fields.add(Field.CHAT_MSG_TYPE, '1'); // What it means?
			packet.fields.add(Field.CHAT_MSG, message);
			this.sendPacket(packet);
		},

		chatLogout: function () {
			var packet = new Packet(Service.CHAT_MSGR_USER_LOGOFF);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.NEED_CMD_RETURN, '116324600'); // What it means?
			this.sendPacket(packet);
		},
		// ---- End Chat ----

		BuddyInfoChanged: function (user, tries) {
			var me = this;

			tries = tries || 1;
			var group = 'Friends';
			var userExists = false;

			for (var groupName in this.friendsList)
				for (var tempUser in this.friendsList[groupName])
					if (tempUser == user.username)
					{
						userExists = true;
						group = groupName;
						break;
					}

			if (userExists)
			{
				this.friendsList[group][user.username] = user;

				this.events.emit('BuddyInfo', {
					'username': user.username,
					'info': user
				});
			}
			else if (tries < 10)
				setTimeout(function(){
					me.BuddyInfoChanged(user, ++tries);
				}, 1000);
		},

		HELO: function () {
			var me = this;

			var username = me.userData.username;
			var password = me.userData.password;

			var request = 'src=ymsgrb&login=' + encodeURIComponent(username) +
						'&passwd=' + encodeURIComponent(password) +
						'&v=2';
						// +'&chal=' + encodeURIComponent(me.userData.challengeStr);

			var httpsClient = https.request({
				method: 'POST',
				host: 'login.yahoo.com',
				port: 443,
				path: '/config/pwtoken_get',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': request.length
				}
			} , function(res) {
				res.on('data', function(response) {
					response = response.toString().split(/\r?\n/g);
					var message = 'Unknown error';
					var errorCode = response.shift();
					switch(errorCode)
					{
						case "0": // Token gotten successfully
							request = 'src=ymsgrb&ext_err=1&v=2&token=' + encodeURIComponent(response[0].replace('ymsgrb=', ''));
							httpsClient = https.request({
								method: 'POST',
								host: 'login.yahoo.com',
								port: 443,
								path: '/config/pwtoken_login',
								headers: {
									'Content-Type': 'application/x-www-form-urlencoded',
									'Content-Length': request.length
								}
							} , function(res) {
								res.on('data', function(response) {
									response = response.toString().split(/\r?\n/g);
									var message = 'Unknown error';
									errorCode = response.shift();
									if (errorCode == "success") // Successful Login
									{
											me.userData.crumb = response[0].substr(6);

											me.userData.crumb_hash = crypto.createHash('md5').update(me.userData.crumb + me.userData.challengeStr).digest("base64")
																						.replace(/\+/g, ".").replace(/\//g, "_").replace(/=/g, "-");
											me.userData.cookies.Y = response[1].substr(2);
											me.userData.cookies.T = response[2].substr(2);

											me.userData.cookies.B = response[4].substr(2);

											var packet = new Packet(Service.USER_LOGIN_2);
											packet.fields.add(Field.CURRENT_ID, username);
											packet.fields.add(Field.USER_NAME, username);
											packet.fields.add(Field.LOGIN_Y_COOKIE, me.userData.cookies.Y);
											packet.fields.add(Field.LOGIN_T_COOKIE, me.userData.cookies.T);
											packet.fields.add(Field.CRUMB_HASH, me.userData.crumb_hash);
											packet.fields.add(Field.COOKIE, me.userData.cookies.B);
											//packet.fields.add(Field.COOKIE, 'F');
											packet.fields.add(Field.ACTIVE_ID, username);
											packet.fields.add(Field.ACTIVE_ID, "1");
											packet.fields.add(Field.CAPABILITY_MATRIX, "33554367"); // Don't know what's this but wrong value will not give friend list
											packet.fields.add(Field.COUNTRY_CODE, "us");
											packet.fields.add(Field.MESSENGER_VERSION, me.MessengerVersion);

											me.sendPacket(packet);

											/*

											START_OF_RECORD 508
												SYMANTEC_MSGS 221F3A1CD4BB
												510 0
											END_OF_RECORD 508

											packet.fields.add(508, new PacketParameters([Field.SYMANTEC_MSGS, '221F3A1CD4BB', 510, '0'], 300));

											*/
									} else
											me.events.emit('loginError', {
												'message': message,
												'errorCode': 100
											});
								});

							}).on('error', function(e) {
								console.error(e);
							});

							httpsClient.write(request);
							httpsClient.end();
							return;

						// I saw 1011. but don't know what it means!
						case "100":
							message = "Missing required field (username or password).";
							break;
						case "1013":
							message = "Username contains @yahoo.com or similar but should not; strip this information.";
							break;
						case "1212":
							message = "Entered password is wrong.";
							break;
						case "1213":
							message = "Login locked. Too many failed login attempts.";
							break;
						case "1214":
							message = "Security lock requiring the use of a CAPTCHA.";
							break;
						case "1216":
							message = "Seems to be a lock, but shows the same generic User ID/Password failure";
							break;
						case "1218":
							message = "The account has been deactivated by Yahoo";
							break;
						case "1235":
							message = "Entered username does not exists.";
							break;
						case "1236":
							message = "Login locked.";
							break;
					}

					me.events.emit('loginError', {
						'message': message,
						'errorCode': errorCode
					});
				});

			}).on('error', function(e) {
				console.error(e);
			});

			httpsClient.write(request);
			httpsClient.end();
		},

		getBuddyImageByAvatarHash: function (AvatarHash) {
			return ("http://img.avatars.yahoo.com/small/?id=" + encodeURIComponent(AvatarHash) + "&src=ymsgr&intl=us&os=win&ver=" + this.messengerVersion);
			// User-Agent: net_http_transaction_impl_manager/0.1
			// returns XML file which contains Base64 encoded image
		},

		getBuddyImageByProfileHash: function (ProfileHash) {
			return ('http://msgr.zenfs.com/msgrDisImg/' + ProfileHash);
			// User-Agent: net_http_transaction_impl_manager/0.1
		},

		getBuddyImage: function (TargetUser, IconChecksum) {
			return ('http://rest-img.msg.yahoo.com/v1/displayImage/custom/yahoo/' + TargetUser + '?src=orion&redirect=true&chksum=' + IconChecksum);
			// User-Agent: net_http_transaction_impl_manager/0.1
			// Cookies : Y & T
		},

		sendPM: function(TargetUser, Message, IMV_ID, IMV_FLAG) {

			if (typeof Message  === "undefined") Message  = '<ding>';
			if (typeof IMV_ID   === "undefined") IMV_ID   = ';0';
			if (typeof IMV_FLAG === "undefined") IMV_FLAG = '0';

			var packet = new Packet(Service.USER_HAS_MSG);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.TARGET_USER, TargetUser);
			packet.fields.add(Field.MSG, Message);
			packet.fields.add(Field.UTF8_FLAG, '1');
			packet.fields.add(Field.IMV_ID, IMV_ID);
			packet.fields.add(Field.IMV_FLAG, IMV_FLAG);
			packet.fields.add(Field.DISPLAY_TYPE, '0' /* TODO: What is Display Type? */);
			this.sendPacket(packet);
		},

		buzz: function(TargetUser, IMV_ID, IMV_FLAG) {

			if (typeof IMV_ID   === "undefined") IMV_ID   = ';0';
			if (typeof IMV_FLAG === "undefined") IMV_FLAG = '0';

			this.sendPM(TargetUser, '<ding>', IMV_ID, IMV_FLAG);
		},

		addBuddy: function(TargetUser, Group, Message, Firstname, Lastname)
		{
			if (typeof Group === "undefined") Group = 'Friends';

			var packet = new Packet(Service.ADD_BUDDY);
			/*if (typeof Message  !== "undefined") */packet.fields.add(Field.MSG, Message);
			packet.fields.add(Field.BUDDY_GRP_NAME, Group);
			packet.fields.add(Field.UTF8_FLAG, '1');
			/*if (typeof Firstname  !== "undefined") */packet.fields.add(Field.FIRSTNAME, Firstname);
			/*if (typeof Lastname  !== "undefined") */packet.fields.add(Field.LASTNAME, Lastname);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);

			packet.fields.add(Field.START_OF_LIST, Field.BUDDIES_RECORD_LIST);

			var buddies = [];
			if (TargetUser instanceof Array)
			{ /* Huh! do nothing! */ }
			else
				TargetUser = [TargetUser];
				
			for (var i = 0; i < TargetUser.length; i++)
			{
				packet.fields.add(Field.START_OF_RECORD, Field.BUDDIES_RECORD_LIST);
				packet.fields.add(Field.BUDDY, TargetUser[i]);
				packet.fields.add(Field.END_OF_RECORD, Field.BUDDIES_RECORD_LIST);
			}

			packet.fields.add(Field.END_OF_LIST, Field.BUDDIES_RECORD_LIST);

			this.sendPacket(packet);
			
		},

		acceptAddBuddy: function(TargetUser)
		{
			var packet = new Packet(Service.BUDDY_AUTHORIZE);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.TARGET_USER, TargetUser);
			packet.fields.add(Field.FLAG, '1');
			this.sendPacket(packet);
		},

		rejectAddBuddy: function(TargetUser, Message)
		{
			var packet = new Packet(Service.BUDDY_AUTHORIZE);
			packet.fields.add(Field.CURRENT_ID, this.userData.username);
			packet.fields.add(Field.TARGET_USER, TargetUser);
			packet.fields.add(Field.FLAG, '2');

			if (typeof Message !== "undefined")
				packet.fields.add(Field.MSG, Message);

			this.sendPacket(packet);
		},

		logout: function() {
			var packet = new Packet(Service.USER_LOGOFF);
			packet.fields.add(505, '0'); /* TODO: What is this? */
			this.sendPacket(packet);
		},

		fireEvent: function (event, data) {
			if (typeof data === 'undefined') data = {};

			data.user_id = this.userData.username;
			this.events.emit(event, data);
			this.events.emit('event', {
				'event': event,
				'data': data
			});
		},

		joint_events: new (require('events').EventEmitter)()

	};

})();

module.exports = function() {

	var MSGR = Object.create(Messenger, (function(){
		var connectionObj = new YahooConnection();

		connectionObj.connect();

		return {

			userData:  {
				writable: false,
				configurable: false,
				enumerable: true,
				value: {
					username: '',
					password: '',
					sessionID: '',
					crumb: '',
					crumb_hash: '',
					cookies: {
						Y: '',
						T: '',
						B: ''
					}
				}
			},

			isInvisible:  {
				writable: true,
				configurable: false,
				enumerable: true,
				value: true
			},

			friendsList:  {
				writable: false,
				configurable: false,
				enumerable: true,
				value: {}
			},

			connection:  {
				writable: false,
				configurable: false,
				enumerable: false,
				value: connectionObj
			},

			public_function:  {
				writable: false,
				configurable: false,
				enumerable: true,
				value: function(){
					return 'This is Public method. it can access ' + private_variable + 's, ' +
					this.singleton_public_variable + 's and ' + this.public_variable + 's.';
				}
			},

			events:  {
				writable: false,
				configurable: false,
				enumerable: false,
				value: new (require('events').EventEmitter)()
			}

		};

	})());

	MSGR.connection.events.on('receive', function (service, fields, packet) {
		switch (service)
		{
			case Service.HELO:
				MSGR.userData.sessionID = packet.sessionID;
				MSGR.userData.challengeStr = fields.get(Field.CHALLENGE);
				MSGR.HELO();
				break;

			case Service.PING:
				MSGR.fireEvent('Ping', {
					'ping_interval': fields.get(Field.PING_INTERVAL),				// Seconds
					'keep_alive_interval': fields.get(Field.KEEP_ALIVE_INTERVAL)	// Hours
				});
				break;

			case Service.USER_LOGIN_2:
				// Login Error
				break;

			case Service.PRELOGIN_DATA:
				MSGR.userData.blinded_userid = fields.get(Field.BLINDED_USERID);		//
				MSGR.userData.cache_crypto_key = fields.get(Field.CACHE_CRYPTO_KEY);	// Still don't know what are these
				MSGR.userData.local_crypto_key = fields.get(Field.LOCAL_CRYPTO_KEY);	//

				MSGR.fireEvent('loginSuccessful', {
					'firstname': fields.get(Field.FIRSTNAME),
					'lastname': fields.get(Field.LASTNAME),
					'profile_picture': MSGR.getBuddyImage(MSGR.userData.username, fields.get(Field.ICON_CHECKSUM))
				});
				break;

			case Service.USER_HAS_MAIL:
				var mails_count = fields.get(Field.NUM_EMAILS);

				var subject = fields.get(Field.MAIL_SUBJECT);
				var from_email = fields.get(Field.FROM_EMAIL);
				var from_name = fields.get(Field.FROM_NAME);
				var mail_link = fields.get(Field.MAIL_LINK);

				if (mail_link)
					MSGR.fireEvent('UserHasMail', {
						'subject': subject,
						'from_email': from_email,
						'from_name': from_name,
						'mail_link': mail_link
					});
				else
					MSGR.fireEvent('UserHasMail', {
						'mails_count': mails_count
					});
				break;

			case Service.BUDDY_LIST:
				fields.get(Field.GROUPS_RECORD_LIST).foreach(function(nothing, group) {
					var groupName = group.get(Field.BUDDY_GRP_NAME);
					var groupList = {};
					group.get(Field.BUDDIES_RECORD_LIST).foreach(function(nothing, userData) {
						var user = {
							username: userData.get(Field.BUDDY)
						};
						groupList[user.username] = user;
					}, this);

					MSGR.friendsList[groupName] = groupList;
					
				}, this);

				MSGR.fireEvent('FriendsList', {
					'friendsList': MSGR.friendsList
				});
				break;

			case Service.BUDDY_INFO:
				fields.get(Field.BUDDY_INFO).foreach(function(nothing, userData) {
					var user = {
						username: userData.get(Field.BUDDY)
					};

					var status = userData.get(Field.AWAY_STATUS);
					for (var status_text in Consts.UserStatus)
						if (Consts.UserStatus[status_text] == status)
							user.status = status_text;

					if (status == Consts.UserStatus.Custom)
						user.statusMessage = userData.get(Field.AWAY_MSG);

					var avatar_hash = userData.get(Field.AVATAR_HASH);
					var icon_checksum = userData.get(Field.ICON_CHECKSUM);
					var profile_hash = userData.get(Field.PROFILE_HASH);

					if (profile_hash)
						user.avatar = MSGR.getBuddyImageByProfileHash(profile_hash);
					else if (avatar_hash)
						user.avatar = MSGR.getBuddyImageByAvatarHash(avatar_hash);
					else if (icon_checksum)
						user.avatar = MSGR.getBuddyImage(icon_checksum);
					/*
					AVATAR_USER
					AVATAR_DEFMOOD
					AVATAR_ZOOM
					*/

					/*
					Other possible fields
					*/
					// SHOW_MY_AVATAR_IN_FRIEND_TREE
					// IDLE_TIME
					// SESSION_ID
					// PORT : in chat?
					// DEVICE_TYPE (SMS) : -> 1 MOBILE USER // sometimes going offline makes this 2, but invisible never sends it
					// NO_IDLE_TIME
					// STATUS_DATA
					// YMAIL_FARM
					// PERSONALS_USER
					// ERR_MSG : Custom error message

					

					var custom_dnd = userData.get(Field.CUSTOM_DND_STATUS); // is it an away message or not. Not applicable for YMSG16 anymore

					for (var temp_custom_dnd in Consts.CustomDND)
						if (Consts.CustomDND[custom_status_link] == custom_dnd)
							user.customDnd = temp_custom_dnd;

					var status_link = userData.get(Field.STATUS_LINK_TYPE);

					for (var custom_status_link in Consts.CustomStatusLink)
						if (Consts.CustomStatusLink[custom_status_link] == status_link)
							user.customStatusLink = custom_status_link;

					if (userData.get(Field.FLAG)) // User has Profile picture or Avatar
					{
						var flag = userData.get(Field.FLAG);
						for (var user_place in Consts.UserPlace)
							if (Consts.UserPlace[user_place] == flag)
								user.userPlace = user_place;
					}

					switch(parseInt(userData.get(Field.DISPLAY_TYPE), 10))
					{
						case 0:
							// User sharing Profile picture
							if (user.avatar)
								MSGR.FRIEND_ICON_DOWNLOAD(user.username); // request user's display image
							break;

						case 1:
							// User sharing Avatar
							if (user.avatar)
								MSGR.FRIEND_ICON_DOWNLOAD(user.username); // request user's display image
							break;

						case 2:
							// User not sharing Profile picture or Avatar
							break;
					}

					MSGR.BuddyInfoChanged(user);
					
				}, MSGR);
				break;

			//case Service.USER_SEND_MESG:
			//	break;

			case Service.CHAT_MSGR_USER_LOGIN:
				MSGR.fireEvent('chatLogin');
				break;

			case Service.CHAT_ROOM_JOIN:
				var errorNo = fields.get(Field.CHAT_ERR_NO);
				if (errorNo === null)
				{
					switch(parseInt(fields.get(Field.FLAG), 10))
					{
						case 1:
							var roomName = fields.get(Field.CHAT_ROOM_NAME);
							var topic = fields.get(Field.CHAT_ROOM_TOPIC);
							var users_count = parseInt(fields.get(Field.CHAT_NUM_USERS), 10); // count of users in this packet

							var users = [];
							var current_user = null;

							fields.foreach(function(key, value) {
								switch (key)
								{
									case Field.CHAT_ROOM_USER_NAME:
										if (current_user !== null)
											users[current_user.username] = current_user;
										current_user = {
											username: value
										};
										break;
									case Field.CHAT_ROOM_USER_AGE:
										current_user.age = value;
										break;
									case Field.CHAT_ROOM_USER_GENDER:
										current_user.gender = value;
										break;
									case Field.CHAT_USER_NICKNAME:
										current_user.nickName = value;
										break;
									case Field.CHAT_USER_LOCATION:
										current_user.location = value;
										break;
									case Field.CHAT_ROOM_USER_FLAG:
										current_user.flag = value;
										break;
								}
							}, this);

							if (current_user !== null)
								users[current_user.username] = current_user;

							fields.get(Field.CHAT_USER_NICKNAME); // Messenger Chat Admin

							// Captcha
							if (topic.substring(0, 15) == "To help prevent")
							{
								var reg = RegExp('http://(.*)', 'i');
								if (reg.test(topic))
								{
									MSGR.fireEvent('chatCaptcha', {
										'room': roomName,
										'url': (reg.exec(topic)[0])
									});
								}
							} else { // Joined

								MSGR.fireEvent('chatJoin', {
									'roomName': fields.get(Field.CHAT_ROOM_NAME),
									'roomTopic': topic,
									'roomCategoryID': fields.get(Field.CHAT_ROOM_CATEGORY),
									'roomSpaceID': fields.get(Field.CHAT_ROOM_SPACEID),
									'voiceAuth': fields.get(Field.CHAT_VOICE_AUTH),
									'users': users
								}); // (Field.CHAT_FLG : 328704)
							}

							break;

						default: // Wrong captcha
							MSGR.fireEvent('chatLoginError', {
								'roomName': fields.get(Field.CHAT_ROOM_NAME),
								'message': fields.get(Field.CHAT_MSG)
							}); // and (Field.CHAT_MSG_TYPE => 1)
							break;
					}
				} else {
					switch(errorNo)
					{
						case '-35':
							break;
					}
				}
				break;

			case Service.CHAT_PUBLIC_MSG:
				MSGR.fireEvent('chatMessage', {
					'roomName': fields.get(Field.CHAT_ROOM_NAME),
					'sender': fields.get(Field.SENDER),
					'fromUser': fields.get(Field.CHAT_ROOM_USER_NAME),
					'message': fields.get(Field.CHAT_MSG)
				}); // and (CHAT_MSG_TYPE => 2)
				break;

			case Service.USER_HAS_MSG:
			
				/* If there was a 429 field, we should send it's value by this packet :
				 * (packetID = 251) current_id = username | target_user = TargetUser | START_OF_LIST = 430 | 430 = [The value for field 429] | END_OF_LIST = 430
				 */

				// There is also a Field.HASH which I don't know what is that.

				var time = Date(parseInt(fields.get(Field.TIME), 10));

				if (fields.get(Field.STATUS) == "6") // SAVED_MESG = 6
				{
					// There is also a Field.COMMAND which I saw it with value = 6
					MSGR.fireEvent('OfflinePM', {
						'sender': fields.get(Field.SENDER),
						'message': (fields.get(Field.MSG) == "<ding>" ? "Buzz!!!" : fields.get(Field.MSG)),
						'time': time
					});
				}
				else
				{
					if (fields.get(Field.MSG) == "<ding>")
					{
						MSGR.fireEvent('Buzz', {
							'sender': fields.get(Field.SENDER),
							'time': time
						});
					}
					else
					{
						MSGR.fireEvent('PM', {
							'sender': fields.get(Field.SENDER),
							'message': fields.get(Field.MSG),
							'time': time
						});
					}
				}
				break;

			case Service.ADD_BUDDY:
				MSGR.fireEvent('AddBuddy', {
					'username': fields.get(Field.BUDDY),
					'group': fields.get(Field.BUDDY_GRP_NAME),
					'error_code': fields.get(Field.ERROR_CODE),
					'unauthorized': fields.get(Field.UNAUTH)
					//'cloud_id': fields.get(Field.CLOUD_ID)
				});
				break;

			case Service.REMOVE_BUDDY:
				MSGR.fireEvent('RemoveBuddy', {
					'username': fields.get(Field.BUDDY),
					'group': fields.get(Field.BUDDY_GRP_NAME),
					'error_code': fields.get(Field.ERROR_CODE)
					//'cloud_id': fields.get(Field.CLOUD_ID)
				});
				break;

			case Service.BUDDY_AUTHORIZE:
				switch (fields.get(Field.FLAG))
				{
					case '1':
						MSGR.fireEvent('BuddyAcceptAddRequest', {
							'username': fields.get(Field.SENDER)
						});
						break;
					case '2':
						MSGR.fireEvent('BuddyRejectAddRequest', {
							'username': fields.get(Field.SENDER),
							'message': fields.get(Field.MSG)
						});
						break;
					default:
						MSGR.fireEvent('BuddyAddRequest', {
							'username': fields.get(Field.SENDER),
							'message': fields.get(Field.MSG),
							'firstname': fields.get(Field.FIRSTNAME),
							'lastname': fields.get(Field.LASTNAME)
						});
						break;
				}
				break;

			case Service.USER_SEND_MESG:
				var sender = fields.get(Field.SENDER);
				switch (fields.get(Field.APPNAME))
				{
					case Consts.AppName.TPING:
					case Consts.AppName.TYPING:
						// There is also a Field.MSG which is a single space
						switch (fields.get(Field.FLAG))
						{
							// Typing
							case "0":
								MSGR.fireEvent('typing', {
									'sender': sender,
									'isTyping': false
								});
								break;

							// Typed
							case "1":
								MSGR.fireEvent('typing', {
									'sender': sender,
									'isTyping': true
								});
								break;
						}
						break;

					case Consts.AppName.INVITE_VIEW_WEBCAM:
						fields.get(Field.SENDER);
						fields.get(Field.TARGET_USER); // me
						fields.get(Field.FLAG); // 0
						fields.get(Field.MSG); // " "
						// TODO : Complete this
						break;

					case Consts.AppName.FILEXFER:
						break;

					case Consts.AppName.GAME:
						break;

					case Consts.AppName.GAMES_INVITE:
						break;

					case Consts.AppName.GAMES_SEND_DATA:
						break;

					case Consts.AppName.IMVIRONMENT:
						break;

					case Consts.AppName.P2P:
						break;

					case Consts.AppName.CONTACTINFO:
						break;
				}
				// There is also a Field.CLOUD_ID which is a single space
				break;

			default : // Unhandeled Packets
				console.log(packet.toString());
				break;
		}
	});

	MSGR.connection.events.on('connect', function (e) {
		MSGR.fireEvent('ready');
	});

	MSGR.connection.events.on('error', function (e) {
		console.log('[Connection Error]', e);
	});

	return MSGR;
};
/*
var x = new module.exports();


x.events.on('ready', function () {
	x.login('adult_vampire' , 'node_js');
});

x.events.on('PM', function (data) {
	console.log(data.time, data.sender, ':', data.message);
});

x.events.on('loginError', function (y) {
	console.log(y);
});

x.events.on('loginSuccessful', function (data) {
	console.log('login Successful :', data);
	//x.sendPM('irdogtag', '1 2 3... test mishavad :D');
	x.chatLogin();
	//x.chatLogout();
	//x.logout();
});

x.events.on('FriendsList', function (y) {
	console.log(y);
});

x.events.on('BuddyInfo', function (y) {
	console.log(y);
});

x.events.on('chatLogin', function () {
	console.log('Chat Login');
	x.chatJoin('1190', 'Asia Global Chat');
});

x.events.on('chatCaptcha', function (y) {
	console.log('chatCaptcha', y);
});

x.events.on('chatJoin', function (y) {
	console.log('chatJoin', y);
	x.sendPublicChatMessage('Asia Global Chat', 'Hi everybody');
});

x.events.on('chatMessage', function (y) {
	console.log('chatMessage', y);
});

x.events.on('typing', function (y) {
	console.log('typing', y);
});
*/