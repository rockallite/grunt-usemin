'use strict';
var debug = require('debug')('djangourlmatch');
var djangoVarOrTagRegex = /^({{.*?}}|{%.*?%})?(.*)$/;
var djangoStaticTagRegex = /^(.*){% ?static ["']?([^"]*?)["']? ?%}(.*)$/;

module.exports = function (f) {
  var outFile, tplVarOrTag, tplStaticTagSuffix;

  // Look for a Django template var prefix
  debug('URL to match: %s', f);
  var result = djangoVarOrTagRegex.exec(f);
  if (!result) {
    // No match
    debug('NO MATCH! Is this a bug?');
    outFile = f;
  } else if (result[1] === undefined) {
    // No template var or tag. Save the rest of URL without a template var or tag prefix
    outFile = result[2];
  }
  else {
    // Template var or tag match. Look for a Django template "static" tag
    var result2 = djangoStaticTagRegex.exec(f);
    if (result2 === null) {
      // No static tag match. Match a prefix var or tag
      tplVarOrTag = result[1];
      // Save the rest of URL with a template var or tag prefix
      outFile = result[2];
    }
    else {
      // Static tag match
      tplStaticTagSuffix = result2[2];
      // Save the resource URL inside "static" tag
      outFile = result2[1];
    }
  }

  return [outFile, tplVarOrTag, tplStaticTagSuffix];
};
