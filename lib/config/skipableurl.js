'use strict';
var skipableURLRegex = /(:\/\/|^\/\/|^#|^\?|^javascript:|^data:|^$)/;

module.exports = function (url) {
  return url.match(skipableURLRegex);
};
