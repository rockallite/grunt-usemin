'use strict';
var djangoUrlMatch = require('./djangourlmatch');

var ResHelper = function() {
  this.src = null;
  this.rawSrc = null;
};

ResHelper.prototype.filterIn = function(f) {
  this.src = f;
  this.rawSrc = djangoUrlMatch(f);
  return this.rawSrc;
};

ResHelper.prototype.filterOut = function(f) {
  return this.src.replace(this.rawSrc, f);
};

ResHelper.prototype.useminFilterOut = function(f) {
  // Strip the {# usemin #}...{# endusemin #} tag
  return this.src.replace(/\{# *usemin *#\}|\{# *endusemin *#\}/gm, '').replace(this.rawSrc, f);
}

var reshelper = new ResHelper();
var filterIn = reshelper.filterIn.bind(reshelper);
var filterOut = reshelper.filterOut.bind(reshelper);
var useminFilterOut = reshelper.useminFilterOut.bind(reshelper);

var djangoPatterns = module.exports = {
  // Test it at: http://regex101.com/#javascript
  'html': [
    /*jshint regexp:false */
    [ /<script\s[^\>]*?src=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|<script\s[^\>]*?src=([^"'\s\>\?#]+)/gm,
    'Update the HTML to reference our concat/min/revved script files',
    filterIn,
    filterOut
    ],
    [ /<link\s[^\>]*?href=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|<link\s[^\>]*?href=([^"'\s\>]+)/gm,
    'Update the HTML with the new css filenames',
    filterIn,
    filterOut
    ],
    [ /<img\s[^\>]*?src=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|<img\s[^\>]*?src=([^"'\s\>]+)/gm,
    'Update the HTML with the new img filenames',
    filterIn,
    filterOut
    ],
    [ /url\(\s*([^"'\)]*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"'\)]*|[^"'\)]+)\s*\)|url\(\s*['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']\s*\)/gm,
    'Update the HTML with background imgs, case there is some inline style',
    filterIn,
    filterOut
    ],
    [ /<a\s[^\>]*?href=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|<a\s[^\>]*?href=([^"'\s\>]+)/gm,
    'Update the HTML with anchors images',
    filterIn,
    filterOut
    ],
    [ /<input\s[^\>]*?src=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|<input\s[^\>]*?src=([^"'\s\>]+)/gm,
    'Update the HTML with reference in input',
    filterIn,
    filterOut
    ],
    [ /(\{# *usemin *#\}.+?\{# *endusemin *#\})/gm,
    'Update the HTML with with resoures inside {# usemin #}...{# endusemin #} tags',
    filterIn,
    useminFilterOut
    ]
  ],
  'css': [
    /*jshint regexp:false */
    [ /url\(\s*([^"'\)]*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"'\)]*|[^"'\)]+)\s*\)|url\(\s*['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']\s*\)|src=['"]([^"']*(?:\{%|\{\{|\{#).+?(?:%\}|\}\}|#\})[^"']*|[^"']+)["']|src=([^"',\)\s]+)/gm,
    'Update the CSS to reference our revved images',
    filterIn,
    filterOut
    ]
  ]
};
