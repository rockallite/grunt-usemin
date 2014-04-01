'use strict';
var path = require('path');
var djangoUrlMatch = require('./djangourlmatch');

exports.name = 'cssmin';

//
// Output a config for the furnished block
// The context variable is used both to take the files to be treated
// (inFiles) and to output the one(s) created (outFiles).
// It aslo conveys whether or not the current process is the last of the pipe
//
exports.createConfig = function(context, block) {
  var cfg = {files: []};
  // FIXME: check context has all the needed info
  var destFile = djangoUrlMatch(block.dest);
  var outfile = path.join(context.outDir, destFile);

  // Depending whether or not we're the last of the step we're not going to output the same thing
  var files = {};
  files.dest = outfile;
  files.src = [];
  context.inFiles.forEach(function(f) { files.src.push(path.join(context.inDir, f));} );

  cfg.files.push(files);
  context.outFiles = [destFile];
  return cfg;
};
