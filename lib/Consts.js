'use strict';

module.exports.Status = {
  ERR: -1,
  DUPLICATE: -3,
  OK: 0,
  NOTIFY: 1,
  NOT_AVAILABLE: 2,
  NEW_BUDDYOF: 3,
  PARTIAL_LIST: 5,
  SAVED_MESG: 6,
  BUDDYOF_DENIED: 7,
  INVALID_USER: 8,
  CHUNKING: 9,
  INVITED: 11,
  DONT_DISTURB: 12,
  DISTURB_ME: 13,
  NEW_BUDDYOF_AUTH: 15,
  WEB_MESG: 16,
  REQUEST: 17,
  ACK: 18,
  RELOGIN: 19,
  SPECIFIC_SNDR: 22,
  SMS_CARRIER: 29,
  ISGROUP_IM: 33,
  INCOMP_VERSION: 24,
  CMD_SENT_ACK: 1000,
  FT_REPLY: 0,
  FT_ERROR: -1,
  FT_NOTIFY: 1,
  FT_NOTIFY_SAVED: 2,
  WEBTOUR_OK: 1,
  CONVERSE_OK: 1,
  UNKNOWN_USER: 1515563605,
  KNOWN_USER: 1515563606
};

module.exports.UserStatus = {
  Offline: -1,
  Available: 0,
  BeRightBack: 1,
  Busy: 2,
  NotAtHome: 3,
  NotAtMyDesk: 4,
  NotInTheOffice: 5,
  OnThePhone: 6,
  OnVacation: 7,
  OutToLunch: 8,
  SteppedOut: 9,
  Invisible: 12,
  Unknown: 14,
  Custom: 99,
  Idle: 999
};

module.exports.ConnectionStatus = {
  Offline: 0,
  Connecting: 1,
  LoggingIn: 2,
  Online: 3,
  LoggingOff: 4
};

module.exports.CustomStatusLink = {
  None: 0,
  Webcam: 1,
  LAUNCHCast: 2,
  Game: 3,
  URL: 4
};

module.exports.UserPlace = {
  IN_PAGER: 1,
  IN_CHAT: 2,
  IN_GAMES: 4
};

module.exports.BuddyAddState = {
  PENDING: 1,
  ACCEPTED: 2,
  DENIED: 3
};

module.exports.CustomDND = {
  Available: 0,
  DoNotDisturb: 1,
  Idle: 2
};

module.exports.DisconnectReason = {
  SAME_ID: 0,
  DIFFERENT_ID: 1,
  NOT_RUNNING: 2,
  OLD_VERSION: 3,
  UNKNOWN: 4
};

module.exports.AppName = {
  GAME: 'GAME',
  TPING: 'TPING',
  TYPING: 'TYPING',
  CONTACTINFO: 'CONTACTINFO',
  INVITE_VIEW_WEBCAM: 'WEBCAMINVITE',
  IMVIRONMENT: 'IMVIRONMENT',
  FILEXFER: 'FILEXFER',
  P2P: 'PEERTOPEER',
  GAMES_INVITE: 'GAMESINVITE',
  GAMES_SEND_DATA: 'GAMESSENDDATA'
};
