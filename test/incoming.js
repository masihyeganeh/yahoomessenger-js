var assert           = require('assert');
var Field            = require('../lib/field');
var YahooMessenger   = require('../index');
var PacketParameters = require('../lib/packetparameters');

var event;
YahooMessenger.fireEvent = function (eventName, eventData) {
  event = {
    'name': eventName,
    'data': eventData
  };
};
YahooMessenger.sessionData.userData.username = 'username';

var tests = [
  [
    'ping',                   // Method Name
    [                         // Packet Data
      Field.PING_INTERVAL,
      1,
      Field.KEEP_ALIVE_INTERVAL,
      60
    ],
    'ping',                   // Event
    {                         // Event Fields
      'ping_interval': 1,
      'keep_alive_interval': 60
    }
  ],
  [
    'userHasMail',
    [
      Field.NUM_EMAILS, 1,
      Field.MAIL_SUBJECT, 'subject',
      Field.FROM_EMAIL, 'email@host.ext',
      Field.FROM_NAME, 'name',
      Field.MAIL_LINK, 'http://www.somewhere.com/'
    ],
    'userHasMail',
    {
      'subject': 'subject',
      'from_email': 'email@host.ext',
      'from_name': 'name',
      'mail_link': 'http://www.somewhere.com/'
    }
  ],
  [
    'userHasMail',
    [
      Field.NUM_EMAILS, 10
    ],
    'userHasMail',
    {
      'mails_count': 10
    }
  ]
  // TODO : add more tests
];

function testEvent(test) {
  test[0] = test[0].charAt(0).toUpperCase() + test[0].slice(1);
  YahooMessenger.parse['on' + test[0]].call(YahooMessenger, test[1]);
  assert.equal(test[2], event.name);
  assert.deepEqual(test[3], event.data);
}

describe('Incoming', function() {
  var test;
  for (test in tests) {
    test = tests[test];
    test[1] = new PacketParameters(test[1]);
    describe('on ' + test[0] + ' with [' +
            (test[1]).toString('').replace(/  /g, '').
            replace(/\n/g, ', ') + ']',
            function() {
      it('should emit ' + test[2] + ' event with required datas',
        function() {
          testEvent(test);
        });
    });
  }
});
