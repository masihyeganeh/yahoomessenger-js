'use strict';

var Field  = require('../field');
var Consts = require('../consts');

module.exports.helo = function helo(fields, packet) {
  this.sessionData.userData.sessionID = packet.sessionID;
  this.sessionData.userData.challengeStr = fields.get(Field.CHALLENGE);
  this.HELO();
};

module.exports.ping = function ping(fields) {
  this.fireEvent('ping', {
    'ping_interval': fields.get(Field.PING_INTERVAL),             // Minutes
    'keep_alive_interval': fields.get(Field.KEEP_ALIVE_INTERVAL)  // Minutes
  });
};

module.exports.userlogin2 = function userlogin2() {
  // Login Error
};

module.exports.preloginData = function preloginData(fields) {
  //
  this.sessionData.blinded_userid = fields.get(Field.BLINDED_USERID);
  // Still don't know what are these
  this.sessionData.cache_crypto_key = fields.get(Field.CACHE_CRYPTO_KEY);
  //
  this.sessionData.local_crypto_key = fields.get(Field.LOCAL_CRYPTO_KEY);

  this.fireEvent('loginSuccessful', {
    'firstname': fields.get(Field.FIRSTNAME),
    'lastname': fields.get(Field.LASTNAME),
    'profile_picture': this.getBuddyImage(
      this.sessionData.username,
      fields.get(Field.ICON_CHECKSUM)
    )
  });
};

module.exports.userHasMail = function userHasMail(fields) {
  var mailsCount = fields.get(Field.NUM_EMAILS);

  var subject = fields.get(Field.MAIL_SUBJECT);
  var fromEmail = fields.get(Field.FROM_EMAIL);
  var fromName = fields.get(Field.FROM_NAME);
  var mailLink = fields.get(Field.MAIL_LINK);

  if (mailLink) {
    this.fireEvent('userHasMail', {
      'subject': subject,
      'from_email': fromEmail,
      'from_name': fromName,
      'mail_link': mailLink
    });
  } else {
    this.fireEvent('userHasMail', {
      'mails_count': mailsCount
    });
  }
};

module.exports.buddyList = function buddyList(fields) {
  var list = fields.get(Field.GROUPS_RECORD_LIST);
  if (list)
  {
    list.foreach(function(nothing, group) {
      var groupName = group.get(Field.BUDDY_GRP_NAME);
      var groupList = {};
      group.get(Field.BUDDIES_RECORD_LIST).foreach(function(nothing, userData) {
        var user = {
          username: userData.get(Field.BUDDY)
        };
        groupList[user.username] = user;
      }, this);

      this.sessionData.friendsList[groupName] = groupList;

    }, this);
  }

  this.fireEvent('friendsList', {
    'friendsList': this.sessionData.friendsList
  });
};

function getCustomDnd(customDnd) {
  for (var tempCustomDnd in Consts.CustomDND) {
    if (Consts.CustomDND[tempCustomDnd] === customDnd) {
      return tempCustomDnd;
    }
  }
  return false;
}

function getAwayStatus(status) {
  for (var statusText in Consts.UserStatus) {
    if (Consts.UserStatus[statusText] === status) {
      return statusText;
    }
  }
  return false;
}

function getStatusLink(statusLink) {
  for (var customStatusLink in Consts.CustomStatusLink) {
    if (Consts.CustomStatusLink[customStatusLink] === statusLink) {
      return customStatusLink;
    }
  }
  return false;
}

function getAvatar(avatarHash, iconChecksum, profileHash, username, context) {
  if (profileHash) {
    return context.getBuddyImageByProfileHash(profileHash);
  } else if (avatarHash) {
    return context.getBuddyImageByAvatarHash(avatarHash);
  } else if (iconChecksum) {
    return context.getBuddyImage(iconChecksum);
  } else {
    return context.friendIconDownload(username);
  }
}

function getUserPlace(flag) {
  for (var userPlace in Consts.UserPlace) {
    if (Consts.UserPlace[userPlace] === flag) {
      return userPlace;
    }
  }
  return false;
}

module.exports.buddyInfo = function buddyInfo(fields) {
  var me = this;
  var buddies = fields.get(Field.BUDDY_INFO);
  if (buddies === null) {
    return;
  }
  buddies.foreach(function(nothing, userData) {
    var user = {
      username: userData.get(Field.BUDDY)
    };

    var status = getAwayStatus(userData.get(Field.AWAY_STATUS));
    if (status) {
      user.status = status;
    }

    if (status === Consts.UserStatus.Custom) {
      user.statusMessage = userData.get(Field.AWAY_MSG);
    }

    var avatarHash = userData.get(Field.AVATAR_HASH);
    var iconChecksum = userData.get(Field.ICON_CHECKSUM);
    var profileHash = userData.get(Field.PROFILE_HASH);

    var avatar = getAvatar(
      avatarHash,
      iconChecksum,
      profileHash,
      me.sessionData.userData.username,
      me
    );
    if (avatar) {
      user.avatar = avatar;
    }
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
    // DEVICE_TYPE (SMS) : ->
    //        1 MOBILE USER // sometimes going offline makes this
    //        2, but invisible never sends it
    // NO_IDLE_TIME
    // STATUS_DATA
    // YMAIL_FARM
    // PERSONALS_USER
    // ERR_MSG : Custom error message


    // is it an away message or not. Not applicable for YMSG16 anymore
    var customDnd = getCustomDnd(userData.get(Field.CUSTOM_DND_STATUS));
    if (customDnd) {
      user.customDnd = customDnd;
    }

    var statusLink = getStatusLink(userData.get(Field.STATUS_LINK_TYPE));
    if (statusLink) {
      user.customStatusLink = statusLink;
    }

    if (userData.get(Field.FLAG)) // User has Profile picture or Avatar
    {
      var userPlace = getUserPlace(userData.get(Field.FLAG));
      if (userPlace) {
        user.userPlace = userPlace;
      }
    }
    /*
    var displayType = parseInt(userData.get(Field.DISPLAY_TYPE), 10);
    switch(displayType)
    {
    case 0:
      // User sharing Profile picture
      break;

    case 1:
      // User sharing Avatar
      break;

    case 2:
      // User not sharing Profile picture or Avatar      
    }
    */
    this.BuddyInfoChanged(user);

  }, this);
};

      //case Service.USER_SEND_MESG:
      //  return;

module.exports.chatmsgruserlogin = function chatmsgruserlogin() {
  this.fireEvent('chatLogin');
};

module.exports.chatRoomJoin = function chatRoomJoin(fields) {
  var errorNo = fields.get(Field.CHAT_ERR_NO);
  if (errorNo === null)
  {
    switch(parseInt(fields.get(Field.FLAG), 10))
    {
    case 1:
      var roomName = fields.get(Field.CHAT_ROOM_NAME);
      var topic = fields.get(Field.CHAT_ROOM_TOPIC);
      // count of users in this packet
      //var usersCount = parseInt(fields.get(Field.CHAT_NUM_USERS), 10);

      var users = [];
      var currentUser = null;

      fields.foreach(function(key, value) {
        switch (key)
        {
        case Field.CHAT_ROOM_USER_NAME:
          if (currentUser !== null) {
            users[currentUser.username] = currentUser;
          }
          currentUser = {
            username: value
          };
          break;
        case Field.CHAT_ROOM_USER_AGE:
          currentUser.age = value;
          break;
        case Field.CHAT_ROOM_USER_GENDER:
          currentUser.gender = value;
          break;
        case Field.CHAT_USER_NICKNAME:
          currentUser.nickName = value;
          break;
        case Field.CHAT_USER_LOCATION:
          currentUser.location = value;
          break;
        case Field.CHAT_ROOM_USER_FLAG:
          currentUser.flag = value;
          break;
        }
      }, this);

      if (currentUser !== null) {
        users[currentUser.username] = currentUser;
      }

      fields.get(Field.CHAT_USER_NICKNAME); // Messenger Chat Admin

      // Captcha
      if (topic.substring(0, 15) === 'To help prevent') {
        var reg = new RegExp('http://(.*)', 'i');
        if (reg.test(topic)) {
          this.fireEvent('chatCaptcha', {
            'room': roomName,
            'url': (reg.exec(topic)[0])
          });
        }
      } else { // Joined
        this.fireEvent('chatJoin', {
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
      this.fireEvent('chatLoginError', {
        'roomName': fields.get(Field.CHAT_ROOM_NAME),
        'message': fields.get(Field.CHAT_MSG)
      }); // and (Field.CHAT_MSG_TYPE => 1)
    }
  } else {
    switch(errorNo)
    {
    case '-35':
      break;
    }
  }
};

module.exports.chatPublicMsg = function chatPublicMsg(fields) {
  this.fireEvent('chatMessage', {
    'roomName': fields.get(Field.CHAT_ROOM_NAME),
    'sender': fields.get(Field.SENDER),
    'fromUser': fields.get(Field.CHAT_ROOM_USER_NAME),
    'message': fields.get(Field.CHAT_MSG)
  }); // and (CHAT_MSG_TYPE => 2)
};

module.exports.userHasMsg = function userHasMsg(fields) {

  /* If there was a 429 field, we should send it's value by this packet :
   * (packetID = 251)
   *  currentId = username
   *  targetUser = TargetUser
   *  START_OF_LIST = 430
   *  430 = [The value for field 429]
   *  END_OF_LIST = 430
   */

  // There is also a Field.HASH which I don't know what is that.

  var time = Date(parseInt(fields.get(Field.TIME), 10));

  if (fields.get(Field.STATUS) === '6') // SAVED_MESG = 6
  {
    // There is also a Field.COMMAND which I saw it with value = 6
    this.fireEvent('offlinePM', {
      'sender': fields.get(Field.SENDER),
      'message': ((fields.get(Field.MSG) === '<ding>' ?
        'Buzz!!!' :
        fields.get(Field.MSG))
      ),
      'time': time
    });
  }
  else
  {
    if (fields.get(Field.MSG) === '<ding>')
    {
      this.fireEvent('buzz', {
        'sender': fields.get(Field.SENDER),
        'time': time
      });
    }
    else
    {
      this.fireEvent('pm', {
        'sender': fields.get(Field.SENDER),
        'message': fields.get(Field.MSG),
        'time': time
      });
    }
  }
};

module.exports.addBuddy = function addBuddy(fields) {
  this.fireEvent('addBuddy', {
    'username': fields.get(Field.BUDDY),
    'group': fields.get(Field.BUDDY_GRP_NAME),
    'error_code': fields.get(Field.ERROR_CODE),
    'unauthorized': fields.get(Field.UNAUTH)
    //'cloud_id': fields.get(Field.CLOUD_ID)
  });
};

module.exports.removeBuddy = function removeBuddy(fields) {
  this.fireEvent('removeBuddy', {
    'username': fields.get(Field.BUDDY),
    'group': fields.get(Field.BUDDY_GRP_NAME),
    'error_code': fields.get(Field.ERROR_CODE)
    //'cloud_id': fields.get(Field.CLOUD_ID)
  });
};

module.exports.buddyAuthorize = function buddyAuthorize(fields) {
  switch (fields.get(Field.FLAG))
  {
  case '1':
    this.fireEvent('buddyAcceptAddRequest', {
      'username': fields.get(Field.SENDER)
    });
    break;
  case '2':
    this.fireEvent('buddyRejectAddRequest', {
      'username': fields.get(Field.SENDER),
      'message': fields.get(Field.MSG)
    });
    break;
  default:
    this.fireEvent('buddyAddRequest', {
      'username': fields.get(Field.SENDER),
      'message': fields.get(Field.MSG),
      'firstname': fields.get(Field.FIRSTNAME),
      'lastname': fields.get(Field.LASTNAME)
    });
    break;
  }
};

module.exports.userSendMesg = function userSendMesg(fields) {
  var sender = fields.get(Field.SENDER);
  this.fireEvent('userSendMessage', {
    'sender': sender
  });
};

module.exports.fxferInvite = function fxferInvite(fields) {
  var sender = fields.get(Field.SENDER);
  var fileTransferSessionID = fields.get(Field.FT_SESSION_ID);
  // it was (new Buffer(fields.get(Field.FT_SESSION_ID), 'base64')).toString();
  switch (fields.get(Field.ACTION_TYPE))
  {
  case '1': // File Transfer Invite
    var filesCount = fields.get(Field.TOTAL_FILE_COUNT);
    var thumbnail = fields.get(Field.THUMBNAIL);

    if (thumbnail) {
      thumbnail = new Buffer(thumbnail, 'base64');
    }

    var files = [];

    fields.get(Field.FILE_INFO).foreach(function(nothing, fileInfo) {
      var file = {
        name: fileInfo.get(Field.FILE_NAME),
        size: fileInfo.get(Field.FILE_SIZE)
      };
      files[file.name] = file;
    }, this);

    this.fireEvent('fileTransferInvite', {
      'sender': sender,
      'sessionID': fileTransferSessionID,
      'thumbnail': thumbnail,
      'filesCount': filesCount,
      'files': files
    });
    break;

  case '2': // File Transfer Cancelled
    this.fireEvent('fileTransferCancelled', {
      'sender': sender,
      'sessionID': fileTransferSessionID
    });
    break;
  }
};

module.exports.fxferSend = function fxferSend(fields) {
  var sender = fields.get(Field.SENDER);
  var fileTransferSessionID = fields.get(Field.FT_SESSION_ID);
  // it was (new Buffer(fields.get(Field.FT_SESSION_ID), 'base64')).toString();
  var errorCode = fields.get(Field.ERROR_CODE);

  if (errorCode === '0')
  {
    this.fireEvent('fileTransferCancelled', {
      'sender': sender,
      'sessionID': fileTransferSessionID
    });
  } else {
    var fileName = fields.get(Field.FILE_NAME);
    var transferType = fields.get(Field.TRANSFER_TYPE); // 3 = HTTP GET?
    var ip = fields.get(Field.TRANSFER_TAG);
    var token = fields.get(Field.TOKEN);
    var Unknown502 = fields.get(Field.UNKNOWN_502); // 1

    this.fireEvent('fileTransfer', {
      'sender': sender,
      'fileName': fileName,
      'transferType': transferType,
      'ip': ip,
      'token': token,
      'sessionID': fileTransferSessionID,
      'Unknown_502': Unknown502
    });
  }
};

function sendIsTyping(sender, isTyping, context) {
  context.fireEvent('typing', {
    'sender': sender,
    'isTyping': isTyping === '1'
  });
}

module.exports.userSendMesg = function userSendMesg(fields) {
  var sender = fields.get(Field.SENDER);
  var appName = fields.get(Field.APPNAME);

  switch (appName)
  {
  case Consts.AppName.TPING:
  case Consts.AppName.TYPING:
    // There is also a Field.MSG which is a single space
    sendIsTyping(sender, fields.get(Field.FLAG), this);
    break;

  case Consts.AppName.INVITE_VIEW_WEBCAM:
    fields.get(Field.SENDER);
    fields.get(Field.TARGET_USER); // me
    fields.get(Field.FLAG); // 0
    fields.get(Field.MSG); // ' '
    // TODO : Complete this
    break;

  case Consts.AppName.FILEXFER:
    break;
/*
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
*/
  case Consts.AppName.CONTACTINFO:
    break;

  // There is also a Field.CLOUD_ID which is a single space
  }
};
