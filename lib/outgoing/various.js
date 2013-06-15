'use strict';

var http    = require('http');
var https   = require('https');
var Field   = require('../field');
var crypto  = require('crypto');
var Consts  = require('../consts');
var Packet  = require('../packet');
var Service = require('../service');

module.exports._download = function _download(ip, path, query, callback) {
  var data = new Buffer(0);
  var request = http.request({
    method: 'GET',
    host: ip,
    path: path,
    headers: {
      'User-Agent': 'net_http_transaction_impl_manager/0.1',
      'Cookie': 'T=' + this.sessionData.userData.cookies.T +'; Y=' +
                this.sessionData.userData.cookies.Y + '; B=' +
                this.sessionData.userData.cookies.B
    }
  }, function(res) {
    res.on('data', function(chunk) {
      data = Buffer.concat([data, chunk]);
    });

    res.on('end', function() {
      callback(data);
    });
  });

  request.on('error', function(e) {
      console.log('Got HTTP error: ' + e.message);
    });

  request.write(query);
  request.end();
  return this;
};

module.exports.sendPacket = function sendPacket(packet) {
  packet.sessionID = this.sessionData.userData.sessionID;
  this.sessionData.connection.send(packet);
  return this;
};

module.exports.login = function login(username, password) {
  this.sessionData.userData.username = username;
  this.sessionData.userData.password = password;

  var packet = new Packet(Service.HELO);
  packet.fields.add(Field.CURRENT_ID, username);
  this.sendPacket(packet);
  return this;
};

module.exports.keepAlive = function keepAlive() {
  var packet = new Packet(Service.KEEP_ALIVE);
  packet.fields.add(Field.USER_NAME, this.sessionData.userData.username);
  this.sendPacket(packet);
  return this;
};

module.exports.ping = function ping() {
  var packet = new Packet(Service.PING);
  this.sendPacket(packet);
  return this;
};

module.exports.sendTyping = function sendTyping(targetUser, stillTyping)
{
  var packet = new Packet(Service.USER_SEND_MESG);
  packet.fields
    .add(Field.APPNAME, Consts.AppName.TYPING)
    .add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.MSG, ' ')
    .add(Field.FLAG, (stillTyping ? '0' : '1'))
    .add(Field.TARGET_USER, targetUser);
  this.sendPacket(packet);
  return this;
};

// ---- Chat ----
module.exports.getChatCategories = function getChatCategories() {
  return ('http://insider.msg.yahoo.com/ycontent/?chatcat');
  // TODO : This is an xml file. this should be parsed and return an array
};

module.exports.getChatRooms = function getChatRooms(categoryID) {
  return ('http://insider.msg.yahoo.com/ycontent/?chatroom_' + categoryID);
  // TODO : This is an xml file. this should be parsed and return an array
};

module.exports.chatLogin = function chatLogin() {
  var packet = new Packet(Service.CHAT_MSGR_USER_LOGIN);
  packet.fields.add(
    Field.CHAT_ROOM_USER_NAME,
    this.sessionData.userData.username
  );
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.PASSWORD, 'abcde')
    .add(Field.COUNTRY_CODE, 'us')
    .add(Field.MESSENGER_VERSION, 'ym' + this.MESSENGER_VERSION);
  this.sendPacket(packet);
  return this;
};

module.exports.chatJoin = function chatJoin(roomID, roomName, captcha) {
  var packet = new Packet(Service.CHAT_ROOM_JOIN)
    .add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.CHAT_ROOM_NAME, roomName)
    .add(Field.CHAT_ROOM_SPACEID, roomID)
    .add(Field.WEBCAM_STATUS, '2');
  // TODO : 0 = ? , 1 = Webcam , 2 = No Webcam , >2 = ?

  if (typeof captcha  !== 'undefined')
  {
    packet.fields.add(Field.CHAT_MSG_TYPE, '1')
      .add(Field.CHAT_MSG, captcha);
  }

  this.sendPacket(packet);
  return this;
};

module.exports.sendPublicChatMessage =
function sendPublicChatMessage(roomName, message)
{
  var packet = new Packet(Service.CHAT_ROOM_JOIN)
    .add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.CHAT_ROOM_NAME, roomName)
    .add(Field.CHAT_MSG_TYPE, '1') // What it means?
    .add(Field.CHAT_MSG, message);
  this.sendPacket(packet);
  return this;
};

module.exports.chatLogout = function chatLogout() {
  var packet = new Packet(Service.CHAT_MSGR_USER_LOGOFF);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.NEED_CMD_RETURN, '116324600'); // What it means?
  this.sendPacket(packet);
  return this;
};
// ---- End Chat ----

module.exports.BuddyInfoChanged = function BuddyInfoChanged(user, tries) {
  var me = this;

  tries = tries || 1;
  var group = 'Friends';
  var userExists = false;

  for (var groupName in this.friendsList) {
    for (var tempUser in this.friendsList[groupName]) {
      if (tempUser === user.username)
      {
        userExists = true;
        group = groupName;
        break;
      }
    }
  }

  if (userExists)
  {
    this.friendsList[group][user.username] = user;

    this.events.emit('BuddyInfo', {
      'username': user.username,
      'info': user
    });
  } else if (tries < 10) {
    setTimeout(function(){
      tries = tries + 1;
      me.BuddyInfoChanged(user, tries);
    }, 1000);
  }
  return this;
};

function loginErrorMessage(errorCode) {
  var message;

  switch(errorCode) {
   // I saw 1011. but don't know what it means!
  case '100':
    message = 'Missing required field (username or password).';
    break;
  case '1013':
    message = 'Username contains @yahoo.com or similar but should not';
    message += '; strip this information.';
    break;
  case '1212':
    message = 'Entered password is wrong.';
    break;
  case '1213':
    message = 'Login locked. Too many failed login attempts.';
    break;
  case '1214':
    message = 'Security lock requiring the use of a CAPTCHA.';
    break;
  case '1216':
    message = 'Seems to be a lock, but shows the same';
    message += ' generic User ID/Password failure';
    break;
  case '1218':
    message = 'The account has been deactivated by Yahoo';
    break;
  case '1235':
    message = 'Entered username does not exists.';
    break;
  case '1236':
    message = 'Login locked.';
    break;
  default:
    message = 'Error #' + errorCode;
  }

  return message;
}

module.exports.HELO = function HELO() {
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

      if (errorCode === '0') { // Token gotten successfully
        request = 'src=ymsgrb&ext_err=1&v=2&token=' +
                  encodeURIComponent(response[0].replace('ymsgrb=', ''));
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
            if (errorCode === 'success') // Successful Login
            {
              me.userData.crumb = response[0].substr(6);

              me.userData.crumbHash = crypto.createHash('md5').
                                      update(
                                        me.userData.crumb +
                                        me.userData.challengeStr
                                      ).digest('base64') .
                                      replace(/\+/g, '.') .
                                      replace(/\//g, '_') .
                                      replace(/=/g, '-');
              me.userData.cookies.Y = response[1].substr(2);
              me.userData.cookies.T = response[2].substr(2);

              me.userData.cookies.B = response[4].substr(2);

              var packet = new Packet(Service.USER_LOGIN_2);
              packet.fields.add(Field.CURRENT_ID, username)
                .add(Field.USER_NAME, username)
                .add(
                  Field.LOGIN_Y_COOKIE, me.userData.cookies.Y
                )
                .add(
                  Field.LOGIN_T_COOKIE, me.userData.cookies.T
                )
                .add(Field.CRUMBHASH, me.userData.crumbHash)
                .add(Field.COOKIE, me.userData.cookies.B)
              //.add(Field.COOKIE, 'F')
                .add(Field.ACTIVE_ID, username)
                .add(Field.ACTIVE_ID, '1')
              // Don't know what's this
              // but wrong value will not give friend list
                .add(Field.CAPABILITY_MATRIX, '33554367')
                .add(Field.COUNTRY_CODE, 'us')
                .add(
                  Field.MESSENGER_VERSION, me.MESSENGER_VERSION
                );

              me.sendPacket(packet);

              /*

              START_OF_RECORD 508
                SYMANTEC_MSGS 221F3A1CD4BB
                510 0
              END_OF_RECORD 508

              packet.fields.add(508, new PacketParameters([
                Field.SYMANTEC_MSGS, '221F3A1CD4BB', 510, '0'
              ], 300));

              */
            } else {
              me.events.emit('loginError', {
                'message': message,
                'errorCode': 100
              });
            }
          });

        }).on('error', function(e) {
          console.log('Error happend at ' + (new Date()).toString() + ':');
          console.error(e);
        });

        httpsClient.write(request);
        httpsClient.end();
        return;
      } else {
        message = loginErrorMessage(errorCode);
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
  return this;
};

module.exports.getBuddyImageByAvatarHash =
function getBuddyImageByAvatarHash(AvatarHash) {
  return ('http://img.avatars.yahoo.com/small/?id=' +
          encodeURIComponent(AvatarHash) +
          '&src=ymsgr&intl=us&os=win&ver=' +
          this.MESSENGER_VERSION
  );
  // User-Agent: net_http_transaction_impl_manager/0.1
  // returns XML file which contains Base64 encoded image
};

module.exports.getBuddyImageByProfileHash =
function getBuddyImageByProfileHash(ProfileHash) {
  return ('http://msgr.zenfs.com/msgrDisImg/' + ProfileHash);
  // User-Agent: net_http_transaction_impl_manager/0.1
};

module.exports.getBuddyImage =
function getBuddyImage(TargetUser, IconChecksum) {
  return ('http://rest-img.msg.yahoo.com/v1/displayImage/custom/yahoo/' +
          TargetUser + '?src=orion&redirect=true&chksum=' + IconChecksum);
  // User-Agent: net_http_transaction_impl_manager/0.1
  // Cookies : Y & T
};

module.exports.acceptFileTransfer =
function acceptFileTransfer(TargetUser, fileTransferSessionID) {
  var packet = new Packet(Service.FXFER_INVITE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FT_SESSION_ID, fileTransferSessionID)
    .add(Field.ACTION_TYPE, '3');
  this.sendPacket(packet);
  return this;
};

module.exports.declineFileTransfer =
function declineFileTransfer(TargetUser, fileTransferSessionID) {
  var packet = new Packet(Service.FXFER_INVITE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FT_SESSION_ID, fileTransferSessionID)
    .add(Field.ACTION_TYPE, '4');
  this.sendPacket(packet);
  return this;
};

module.exports.fileTransferGetFile =
function fileTransferGetFile(TargetUser, ip, token, callback) {
  var request = 'token=' + encodeURIComponent(token) +
        '&sender=' + encodeURIComponent(TargetUser) +
        '&recver=' + encodeURIComponent(this.sessionData.userData.username);

  this._download(ip, '/relay?' + request, '', callback);
  return this;
};

module.exports.receiveFile = function receiveFile(
  TargetUser,
  fileTransferSessionID,
  fileName,
  transferType,
  ip,
  token
) {
  var packet = new Packet(Service.FXFER_RECEIVE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FT_SESSION_ID, fileTransferSessionID)
    .add(Field.FILE_NAME, fileName)
    .add(Field.TRANSFER_TYPE, transferType)
    .add(Field.TRANSFER_TAG, ip)
    .add(Field.TOKEN, token);
  this.sendPacket(packet);
  return this;
};

// while receiving file
module.exports.cancelFileReceive =
function cancelFileReceive(TargetUser, fileTransferSessionID) {
  var packet = new Packet(Service.FXFER_RECEIVE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FT_SESSION_ID, fileTransferSessionID)
    .add(Field.ERROR_CODE, 'ERROR_CODE');
  this.sendPacket(packet);
  return this;
};

module.exports.sendPM = function sendPM(TargetUser, Message, imvId, imvFlag) {
  if (typeof Message === 'undefined') {
    Message  = '<ding>';
  }
  if (typeof imvId === 'undefined') {
    imvId   = ';0';
  }
  if (typeof imvFlag === 'undefined') {
    imvFlag = '0';
  }

  var packet = new Packet(Service.USER_HAS_MSG);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.MSG, Message)
    .add(Field.UTF8_FLAG, '1')
    .add(Field.imvId, imvId)
    .add(Field.imvFlag, imvFlag)
    .add(Field.DISPLAY_TYPE, '0' /* TODO: What is Display Type? */);
  this.sendPacket(packet);
  return this;
};

module.exports.buzz = function buzz(TargetUser, imvId, imvFlag) {
  if (typeof imvId === 'undefined') {
    imvId   = ';0';
  }
  if (typeof imvFlag === 'undefined') {
    imvFlag = '0';
  }

  this.sendPM(TargetUser, '<ding>', imvId, imvFlag);
  return this;
};

module.exports.addBuddy =
function addBuddy(TargetUser, Group, Message, Firstname, Lastname)
{
  if (typeof Group === 'undefined') {
    Group = 'Friends';
  }

  var packet = new Packet(Service.ADD_BUDDY);
  /*if (typeof Message  !== 'undefined') */
  packet.fields.add(Field.MSG, Message)
    .add(Field.BUDDY_GRP_NAME, Group)
    .add(Field.UTF8_FLAG, '1')
  /*if (typeof Firstname  !== 'undefined') */
    .add(Field.FIRSTNAME, Firstname)
  /*if (typeof Lastname  !== 'undefined') */
    .add(Field.LASTNAME, Lastname)
    .add(Field.CURRENT_ID, this.sessionData.userData.username)

    .add(Field.START_OF_LIST, Field.BUDDIES_RECORD_LIST);

  if (!(TargetUser instanceof Array)) {
    TargetUser = [TargetUser];
  }
    
  for (var i = 0; i < TargetUser.length; i += 1) {
    packet.fields.add(Field.START_OF_RECORD, Field.BUDDIES_RECORD_LIST)
      .add(Field.BUDDY, TargetUser[i])
      .add(Field.END_OF_RECORD, Field.BUDDIES_RECORD_LIST);
  }

  packet.fields.add(Field.END_OF_LIST, Field.BUDDIES_RECORD_LIST);

  this.sendPacket(packet);
  
  return this;
};

module.exports.acceptAddBuddy = function acceptAddBuddy(TargetUser)
{
  var packet = new Packet(Service.BUDDY_AUTHORIZE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FLAG, '1');
  this.sendPacket(packet);
  return this;
};

module.exports.rejectAddBuddy = function rejectAddBuddy(TargetUser, Message)
{
  var packet = new Packet(Service.BUDDY_AUTHORIZE);
  packet.fields.add(Field.CURRENT_ID, this.sessionData.userData.username)
    .add(Field.TARGET_USER, TargetUser)
    .add(Field.FLAG, '2');

  if (typeof Message !== 'undefined') {
    packet.fields.add(Field.MSG, Message);
  }

  this.sendPacket(packet);
  return this;
};

module.exports.logout = function logout() {
  var packet = new Packet(Service.USER_LOGOFF);
  packet.fields.add(505, '0'); /* TODO: What is this? */
  this.sendPacket(packet);
  return this;
};
