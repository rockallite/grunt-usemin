'use strict';
var path = require('path');
var fs = require('fs');
var djangoUrlMatch = require('./djangourlmatch');
var util = require('util');
var inspect = function (obj) {
  return util.inspect(obj, false, 4, true);
};

exports.name = 'concat';

//
// Output a config for the furnished block
// The context variable is used both to take the files to be treated
// (inFiles) and to output the one(s) created (outFiles).
// It aslo conveys whether or not the current process is the last of the pipe
//
exports.createConfig = function(context, block) {
  var cfg = {files: []};
  // FIXME: check context has all the needed info
  var outfile = path.join(context.outDir, block.dest);

  // Depending whether or not we're the last of the step we're not going to output the same thing
  var files = {};
  files.dest = outfile;
  files.src = [];

  var tplVarOrTag, tplStaticTagSuffix;
  context.inFiles.forEach(function(f) {
    // Look for a Django template var prefix
    var result = djangoUrlMatch(f);

    if (result[1] !== undefined && tplStaticTagSuffix !== undefined ||
      result[2] !== undefined && tplVarOrTag !== undefined) {
      throw new Error('Mixing {% static %} tag with template var or other tag prefix in the same block not supported:\n  ' + inspect(context.inFiles));
    }

    if (result[2] === undefined) {
      // No static tag match
      // There's a prefix var or tag match, or no match at all (prefix is '')
      if (tplVarOrTag === undefined) {
        // Save template var or tag prefix
        tplVarOrTag = result[1] || '';
      }
      else if (tplVarOrTag !== result[1] || '') {
        throw new Error('Different template var or tag prefix in the same block not supported:\n  ' + inspect(context.inFiles));
      }
    }
    else {
      // Static tag match
      if (tplStaticTagSuffix === undefined) {
        tplStaticTagSuffix = result[2];
      }
      else if (tplStaticTagSuffix !== result[2]) {
        throw new Error('Different suffix after {% static %} tag in the same block not supported:\n  ' + inspect(context.inFiles));
      }
    }
    // Save the resource URL
    f = result[0];

    if(Array.isArray(context.inDir)) {
      context.inDir.every(function(d) {
        var joinedPath = path.join(d, f);
        var joinedPathExists = fs.existsSync(joinedPath);
        if(joinedPathExists) {
          files.src.push(joinedPath);
        }
        return !joinedPathExists;
      });
    }
    else {
      files.src.push(path.join(context.inDir, f));
    }
  });

  if (tplVarOrTag) {
    // Save the template var or tag prefix as "prefix" property
    files.prefix = tplVarOrTag;
  }
  else if (tplStaticTagSuffix !== undefined) {
    // Save the static tag suffix as "suffixStatic" property
    files.suffixStatic = tplStaticTagSuffix;
  }

  cfg.files.push(files);
  context.outFiles = [block.dest];
  return cfg;
};
