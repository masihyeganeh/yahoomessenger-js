var assert         = require('assert');
var Field          = require('../lib/field');
var Consts         = require('../lib/consts');
var Service        = require('../lib/service');
var YahooMessenger = require('../index');

var result;
YahooMessenger.sendPacket = function (data) {
  data.fields = data.fields.toArray();
  delete data.rawPacketHeader;
  result = data;
};
YahooMessenger.sessionData.userData.username = 'username';

var tests = [
  [
    'login',                       // Method Name
    ['username', 'password'],      // Arguments
    'HELO',                        // Service
    [Field.CURRENT_ID, 'username'] // Result Fields
  ],
  [
    'keepAlive',
    [],
    'KEEP_ALIVE',
    [Field.USER_NAME, 'username']
  ],
  [
    'sendTyping',
    ['username2', true],
    'USER_SEND_MESG',
    [
      Field.APPNAME, Consts.AppName.TYPING,
      Field.CURRENT_ID, 'username',
      Field.MSG, ' ',
      Field.FLAG, '0',
      Field.TARGET_USER, 'username2'
    ]
  ],
  [
    'sendTyping',
    ['username2', false],
    'USER_SEND_MESG',
    [
      Field.APPNAME, Consts.AppName.TYPING,
      Field.CURRENT_ID, 'username',
      Field.MSG, ' ',
      Field.FLAG, '1',
      Field.TARGET_USER, 'username2'
    ]
  ]
  // TODO : add more tests
];

function testMethod(test) {
  YahooMessenger[test[0]].apply(YahooMessenger, test[1]);
  assert.equal(Service[test[2]], result.service);
  assert.deepEqual(test[3], result.fields);
}

describe('Outgoing', function() {
  var test;
  for (test in tests) {
    test = tests[test];
    describe(test[0] + '(' + (test[1]).join(', ') + ')', function() {
      it('should send ' + test[2] + ' packet with required fields',
        function() {
          testMethod(test);
        });
    });
  }
});
