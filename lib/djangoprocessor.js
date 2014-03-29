'use strict';
var _ = require('lodash');
var path = require('path');
var djangoUrlMatch = require('./config/djangourlmatch');

var DjangoProcessor = module.exports = function (grunt) {
  this.config = grunt.config;
  this.log = grunt.log;
  this.djangoGeneratedFilesCache = undefined;
  this.djangoPrefixCache = undefined;
  this.djangoSuffixStaticCache = undefined;

  var findPrefixSuffix = this.findPrefixSuffix.bind(this);
  var findImgPrefixSuffix = this.findImgPrefixSuffix.bind(this);
  var processPrefixSuffixUrl = this.processPrefixSuffixUrl.bind(this);
  this.patterns = {
    html: [
      /*jshint regexp:false */
      [ /<script.+src=['"]([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']/gm,
      'Update the HTML to reference our concat/min/revved script files',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<link[^\>]+href=['"]([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']/gm,
      'Update the HTML with the new css filenames',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<img[^\>]+src=['"]([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']/gm,
      'Update the HTML with the new img filenames',
      findImgPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /url\(\s*['"]?([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']?\s*\)/gm,
      'Update the HTML with background imgs, case there is some inline style',
      findImgPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<a[^\>]+href=['"]([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']/gm,
      'Update the HTML with anchors images',
      findImgPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [/<input[^\>]+src=['"]([^"']*(?:{%).+(?:%})[^"']*|[^"']+)["']/gm,
      'Update the HTML with reference in input',
      findImgPrefixSuffix,
      processPrefixSuffixUrl
      ]
    ]
  };
};

DjangoProcessor.prototype.findPrefixSuffix = function (m) {
  if (m[0] === '#' || m.indexOf('//') >= 0 || m.indexOf('/') === 0) {
    this.djangoPrefixCache = undefined;
    this.djangoSuffixStaticCache = undefined;
  }
  else {
    var fpath = path.join(this.config('useminPrepare').options.dest, m);
    this.log.debug('  File to search: ' + fpath);
    if (!this.djangoGeneratedFilesCache) {
      var jsFiles = this.config('uglify').generated.files;
      var cssFiles = this.config('cssmin').generated.files;
      this.djangoGeneratedFilesCache = jsFiles.concat(cssFiles);
    }
    _.find(this.djangoGeneratedFilesCache, function(f) {
      if (f.dest === fpath) {
        this.djangoPrefixCache = f.prefix;
        this.log.debug('  Got prefix: ' + this.djangoPrefixCache);
        this.djangoSuffixStaticCache = f.suffixStatic;
        this.log.debug('  Got suffixStatic: ' + this.djangoSuffixStaticCache);
        return true;
      }
    }, this);
  }
  return m;
};

DjangoProcessor.prototype.findImgPrefixSuffix = function (m) {
  if (m[0] === '#' || m.indexOf('//') >= 0 || m.indexOf('/') === 0) {
    this.djangoPrefixCache = undefined;
    this.djangoSuffixStaticCache = undefined;
  }
  else {
    var result = djangoUrlMatch(m);
    m = result[0];
    this.log.debug('  Image to handle: ' + m);
    this.djangoPrefixCache = result[1];
    this.log.debug('  Got prefix: ' + this.djangoPrefixCache);
    this.djangoSuffixStaticCache = result[2];
    this.log.debug('  Got suffixStatic: ' + this.djangoSuffixStaticCache);
  }
  return m;
};

DjangoProcessor.prototype.processPrefixSuffixUrl = function (m) {
  if (this.djangoPrefixCache !== undefined) {
    m = this.djangoPrefixCache + m;
    this.djangoPrefixCache = undefined;
    this.log.debug('  Out-file with prefix: ' + m);
  }
  else if (this.djangoSuffixStaticCache !== undefined) {
    m = _.template(
      '{% static <%= filename %> %}<%= suffix %>',
      {
        filename: m,
        suffix: this.djangoSuffixStaticCache
      }
    );
    this.djangoSuffixStaticCache = undefined;
    this.log.debug('  Out-file with tag and suffix: ' + m);
  }
  return m;
};
