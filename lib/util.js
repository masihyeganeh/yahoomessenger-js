module.exports.upperCamelCase = function upperCamelCase(value) {
  value = value.toString();
  var pattern = /^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g;
  value = value.replace(/[-_]+/g, ' ').toLowerCase();
  value = value.replace(pattern, function ($1) {
      return $1.toUpperCase();
    }).replace(/\s+/g, '');
  return value;
};

module.exports.lowerCamelCase = function lowerCamelCase(value) {
  value = module.exports.upperCamelCase(value);
  value = value.charAt(0).toLowerCase() + value.slice(1);
  return value;
};

module.exports.bufferIndexOf = function bufferIndexOf(buff, str) {
  if (typeof str !== 'string' || str.length === 0 || str.length > buff.length) {
    return -1;
  }
  var search = str.split("").map(function(el) {
    return el.charCodeAt(0);
  }),
  searchLen = search.length,
  ret = -1, i, j, len;
  for (i=0,len=buff.length; i<len; ++i) {
    if (buff[i] == search[0] && (len-i) >= searchLen) {
      if (searchLen > 1) {
        for (j=1; j<searchLen; ++j) {
          if (buff[i+j] != search[j]) {
            break;
          } else if (j == searchLen-1) {
            ret = i;
            break;
          }
        }
      } else {
        ret = i;
      }
      if (ret > -1) {
        break;
      }
    }
  }
  return ret;
};
