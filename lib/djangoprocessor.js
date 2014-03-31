'use strict';
var debug = require('debug')('djangoprocessor');
var _ = require('lodash');
var path = require('path');
var djangoUrlMatch = require('./config/djangourlmatch');

var DjangoProcessor = module.exports = function (grunt) {
  this.config = grunt.config;
  this.djangoGeneratedFilesCache = undefined;
  this.djangoPrefixCache = undefined;
  this.djangoSuffixStaticCache = undefined;

  var findPrefixSuffix = this.findPrefixSuffix.bind(this);
  var processPrefixSuffixUrl = this.processPrefixSuffixUrl.bind(this);
  this.patterns = {
    // Test it at: http://regex101.com/#javascript
    html: [
      /*jshint regexp:false */
      [ /<script.+src=['"]([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']/gm,
      'Update the HTML to reference our concat/min/revved script files',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<link[^\>]+href=['"]([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']/gm,
      'Update the HTML with the new css filenames',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<img[^\>]+src=['"]([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']/gm,
      'Update the HTML with the new img filenames',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /url\(\s*['"]?([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']?\s*\)/gm,
      'Update the HTML with background imgs, case there is some inline style',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [ /<a[^\>]+href=['"]([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']/gm,
      'Update the HTML with anchors images',
      findPrefixSuffix,
      processPrefixSuffixUrl
      ],
      [/<input[^\>]+src=['"]([^"']*(?:{%|{{).+?(?:%}|}})[^"']*|[^"']+)["']/gm,
      'Update the HTML with reference in input',
      findPrefixSuffix,
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
    debug('URL to handle: %s', m);
    var result = djangoUrlMatch(m);
    m = result[0];
    debug('Raw file: %s', m);
    this.djangoPrefixCache = result[1];
    this.djangoSuffixStaticCache = result[2];
    if (this.djangoPrefixCache === undefined && this.djangoSuffixStaticCache === undefined) {
      // No prefix or suffix match
      if (m.match(/(:\/\/|^\/\/|^#|^\?|^javascript:)/)) {
        // URL prefix to skip
        debug('(Skipped)');
      }
      else {
        // Prepend the destination prefix and search it in generated files
        var fpath = path.join(this.config('useminPrepare').options.dest, m);
        debug('File to search: %s', fpath);
        if (!this.djangoGeneratedFilesCache) {
          var jsFiles = this.config('uglify').generated.files;
          var cssFiles = this.config('cssmin').generated.files;
          this.djangoGeneratedFilesCache = jsFiles.concat(cssFiles);
        }
        _.find(this.djangoGeneratedFilesCache, function(f) {
          if (f.dest === fpath) {
            this.djangoPrefixCache = f.prefix;
            this.djangoSuffixStaticCache = f.suffixStatic;
            debug('Got prefix: %s', this.djangoPrefixCache);
            debug('Got suffixStatic: %s', this.djangoSuffixStaticCache);
            return true;
          }
        }, this);
      }
    }
    else {
      // A prefix or suffix is found
      debug('Got prefix: %s', this.djangoPrefixCache);
      debug('Got suffixStatic: %s', this.djangoSuffixStaticCache);
    }
  }
  return m;
};

DjangoProcessor.prototype.processPrefixSuffixUrl = function (m) {
  if (this.djangoPrefixCache !== undefined) {
    m = this.djangoPrefixCache + m;
    this.djangoPrefixCache = undefined;
    debug('Out-file with prefix: %s', m);
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
    debug('Out-file with tag and suffix: %s', m);
  }
  return m;
};
