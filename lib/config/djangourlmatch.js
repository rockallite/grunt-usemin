'use strict';
var debug = require('debug')('djangourlmatch');
var djangoStaticTagURLRegex = /\{% ?static ['"]?(.+?)['"]? (?:as \w+)? ?%\}/;
var djangoVarAndTagMatchRegex = /\s*(?:{% *comment *%}.*?{% *endcomment *%}|{{.*?}}|{%.*?%}|{#.*?#})/g;

module.exports = function (f) {
  var url;

  var result = djangoStaticTagURLRegex.exec(f);
  if (result) {
    // Match {% static %} tag
    url = result[1];
    debug('URL in static tag: %s', url);
  }
  else {
    // No match {% static %} tag. Strip all vars and tags
    url = f.replace(djangoVarAndTagMatchRegex, '');
    debug('URL without vars and tags: %s', url);
  }

  var rawUrl = url.split(/\?|#/, 2)[0];
  if (rawUrl !== url)  {
    debug('Raw URL: %s', rawUrl);
  }

  return rawUrl;
};
