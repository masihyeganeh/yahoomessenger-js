YahooMessenger.js
=================

[![Build Status](https://travis-ci.org/masihyeganeh/yahoomessenger-js.png)](https://travis-ci.org/masihyeganeh/yahoomessenger-js)
[![NPM version](https://badge.fury.io/js/yahoomessenger.png)](http://npmjs.org/package/yahoomessenger)
[![Dependency Status](https://gemnasium.com/masihyeganeh/yahoomessenger-js.png)](https://gemnasium.com/masihyeganeh/yahoomessenger-js)

Yahoo! Messenger in node.js

This is a Beta release and is under development but some main features are ready to use.

Instantiation
-------------

This module consists of a singleton `YahooMessenger` class and a `sessionData` object for each user.
First you need to include `YahooMessenger`

``` javascript
var YahooMessenger = require('yahoomessenger');
```

Then for each user you need a new instance.

``` javascript
YahooMessenger.newInstance();
```
Then you will receive a `ready` event and it's ready to work with then.

How to use
----------

### Single User

Here is an example for single user:
``` javascript
var YahooMessenger = require('yahoomessenger');
YahooMessenger.newInstance();

YahooMessenger.on('ready', function onReady(){
  YahooMessenger.login('Yahoo! ID', 'Yahoo! Password');
});

YahooMessenger.on('loginSuccessful', function onLoginSuccessful(data){
  console.log('Welcome ' + data.firstname + ' ' + data.lastname);

  YahooMessenger.sendPM('Friend Yahoo! ID', 'Hi. I am using YahooMessenger.js, It\'s cool!');
});
```

As you can see, you can send requests to Yahoo! server by `YahooMessenger`'s public methods
and receive responses by Events.

After calling `newInstance` method, it generates a session in `YahooMessenger.sessionData`.
You can store session of each user in an array and change it before calling methods.
Each event contains a `user_id` to distinguish response for multiple users.

### Multi User

Here is an example for multi user:
``` javascript
var users = {};

var YahooMessenger = require('yahoomessenger');

YahooMessenger.newInstance();
users.ID1 = YahooMessenger.sessionData;

YahooMessenger.newInstance();
users.ID2 = YahooMessenger.sessionData;

YahooMessenger.on('ready', function onReady(data){
  YahooMessenger.sessionData = users[data.user_id];

  // do something
});

// ...
YahooMessenger.sessionData = users.ID2;
YahooMessenger.sendPM('someone', 'Hey! I\'m User 2');

```

`YahooMessenger`'s methods are chainable.
``` javascript
YahooMessenger.addBuddy('ID', 'Group')
  .sendPM('ID', 'Message')
  .buzz('ID2')
  .sendPM('ID3', 'Message');
```

Incoming Events
---------------
```
# Internal
ping

# Login
loginSuccessful
loginError

# Misc
userHasMail
userSendMessage

# Chat
chatLogin
chatCaptcha
chatJoin
chatLoginError
chatMessage

# PM
pm
offlinePM
buzz

# Friends
friendsList
addBuddy
removeBuddy
buddyAcceptAddRequest
buddyRejectAddRequest
buddyAddRequest

# File Transfer
fileTransferInvite
fileTransferCancelled
fileTransfer
```

Outgoing Methods
----------------
```
# Internal
keepAlive
ping

# Login
login
logout

# Chat
chatLogin
chatJoin
getChatCategories
getChatRooms
sendPublicChatMessage
chatLogout

# Avatar
getBuddyImageByAvatarHash
getBuddyImageByProfileHash
getBuddyImage

# File Transfer
acceptFileTransfer
declineFileTransfer
fileTransferGetFile
receiveFile
cancelFileReceive

# PM
sendPM
buzz
sendTyping

# Friends
addBuddy
acceptAddBuddy
rejectAddBuddy
BuddyInfoChanged

# Status
setAwayStatus
setCustomAwayStatus
```

TODOs
-----

* Write more tests
* Add more of Yahoo! functions
