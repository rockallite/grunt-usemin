'use strict';
var debug = require('debug')('file');
var path = require('path');
var fs = require('fs');

// File is responsible to gather all information related to a given parsed file, as:
//  - its dir and name
//  - its content
//  - the search paths where referecned resource will be looked at
//  - the list of parsed blocks
//

//
// Returns an array object of all the directives for the given html.
// Each item of the array has the following form:
//
//
//     {
//       type: 'css',
//       dest: 'css/site.css',
//       src: [
//         'css/normalize.css',
//         'css/main.css'
//       ],
//       raw: [
//         '    <!-- build:css css/site.css -->',
//         '    <link rel="stylesheet" href="css/normalize.css">',
//         '    <link rel="stylesheet" href="css/main.css">',
//         '    <!-- endbuild -->'
//       ]
//     }
//
// Note also that dest is expressed relatively from the root. I.e., if the block starts with:
//    <!-- build:css /foo/css/site.css -->
// then dest will equal foo/css/site.css (note missing trailing /)
//
var getBlocks = function (content) {
  // start build pattern: will match
  //  * <!-- build:[target] output -->
  //  * <!-- build:[target]:revonly output -->
  //  * <!-- build:[target](alternate search path) output -->
  //  * <!-- build:[target]:revonly(alternate search path) output -->
  // The following matching param are set when there's match
  //   * 0 : the whole matched expression
  //   * 1 : the target (ie. type)
  //   * 2 : the alternate search path
  //   * 3 : the output
  //
  var htmlRegBuild = /<!--\s*build:(\w+)(?::(revonly))?(?:\(([^\)]+)\))?\s*(.+?)\s*-->/;
  // end build pattern -- <!-- endbuild -->
  var htmlRegEndBuild = /<!--\s*endbuild\s*-->/;
  // Exclude from build: <!-- exclude --> ... <!-- endexclude -->
  var htmlRegExclude = /<!--\s*exclude\s*-->/;
  var htmlRegEndExclude = /<!--\s*endexclude\s*-->/;

  // Start build pattern in JavaScript code: will match
  //  * /*** build:[target] output ***/
  //  * /*** build:[target]:revonly output ***/
  //  * /*** build:[target](alternate search path) output -->
  //  * /*** build:[target]:revonly(alternate search path) output -->
  // Only ONE literal string per line inside the block is supported.
  // Suffix of the last line in the block is preserved.
  //
  // The following matching param are set when there's match
  //   * 0 : the whole matched expression
  //   * 1 : the target (ie. type)
  //   * 2 : the alternate search path
  //   * 3 : the output
  //
  var jsRegBuild = /\/\*\*\*\s*build:(\w+)(?::(revonly))?(?:\(([^\)]+)\))?\s*(.+?)\s*\*\*\*\//;
  // end build pattern -- /*** endbuild ***/
  var jsRegEndBuild = /\/\*\*\*\s*endbuild\s*\*\*\*\//;
  // Exclude from build: /*** exclude ***/ ... /*** endexclude ***/
  var jsRegExclude = /\/\*\*\*\s*exclude\s*\*\*\*\//;
  var jsRegEndExclude = /\/\*\*\*\s*endexclude\s*\*\*\*\//;

  var lines = content.replace(/\r\n/g, '\n').split(/\n/),
      block = false,
      exclusion = false,
      sections = [],
      last;

  lines.forEach(function (l) {
    var htmlbuild, jsbuild, htmlendbuild, jsendbuild,
        htmlexclude, jsexclude, htmlendexclude, jsendexclude,
        indent, asset;

    var build = (htmlbuild = l.match(htmlRegBuild)) || (jsbuild = l.match(jsRegBuild));
    var endbuild = (htmlendbuild = htmlRegEndBuild.test(l)) || (jsendbuild = jsRegEndBuild.test(l));

    if (!(htmlexclude = htmlRegExclude.test(l))) {
      jsexclude = jsRegExclude.test(l);
    }
    if (!(htmlendexclude = htmlRegEndExclude.test(l))) {
      jsendexclude = jsRegEndExclude.test(l);
    }

    var startFromRoot = false;

    if (block && last) {
      // Exclusion start within a block
      if (last.contentType === 'javascript' && jsexclude || htmlexclude) {
        // Start exclusion from block
        exclusion = true;
      }
      else if (last.contentType === 'javascript' && jsendexclude || htmlendexclude) {
        // Turn off exclusion from block
        exclusion = false;
      }
    }

    // discard empty lines
    if (build) {
      indent = (l.match(/^\s*/) || [])[0];
      block = true;
      // Handle absolute path (i.e. with respect to the server root)
      // if (build[3][0] === '/') {
      //   startFromRoot = true;
      //   build[3] = build[3].substr(1);
      // }
      last = {
        contentType: htmlbuild ? 'html' : 'javascript',
        type: build[1],
        dest: build[4],
        startFromRoot: startFromRoot,
        indent: indent,
        searchPath: [],
        src: [],
        raw: []
      };

      if (build[2] === 'revonly') {
        // Rev only
        last.revonly = true;
        debug('%s is rev-only', last.dest);
      }

      if (build[3]) {
        // Alternate search path
        last.searchPath.push(build[3]);
      }

      // Skip the <!-- build --> or /*** build ***/ line
      return;
    }

    if (block && last.contentType === 'html') {
      // Check IE conditionals
      var isConditionalStart = l.match(/<!--\[[^\]]+\]>/);
      var isConditionalEnd = l.match(/<!\[endif\]-->/);
      if (isConditionalStart) {
        last.conditionalStart = isConditionalStart;
      }
      if (isConditionalEnd) {
        last.conditionalEnd = isConditionalEnd;
      }
    }

    // switch back block flag when endbuild
    if (block && endbuild) {
      last.raw.push(l);
      sections.push(last);
      block = false;
      // Turn off exclusion at the end of block
      exclusion = false;
    }

    if (block && last) {
      if (!exclusion) {
        if (last.contentType === 'javascript') {
          // JavaScript content. Only match ONE literal string per line
          asset = l.match(/^\s*(.*?)["']([^"']*(?:{%).+(?:%})[^"']*|[^'"]+)["'](.*)/);
          if (asset && asset[2]) {
            last.src.push(asset[2]);
            last.prefix = asset[1];
            last.suffix = asset[3];
          }
        }
        else {
          // HTML content
          asset = l.match(/(href|src)=["']([^"']*(?:{%).+(?:%})[^"']*|[^'"]+)["']/);
          if (asset && asset[2]) {
            last.src.push(asset[2]);

            var media = l.match(/media=['"]([^"']*(?:{%).+(?:%})[^"']*|[^'"]+)['"]/);
            // FIXME: media attribute should be present for all members of the block *and* having the same value
            if ( media ) {
              last.media = media[1];
            }

            // preserve defer attribute
            var defer = / defer/.test(l);
            if (defer && last.defer === false || last.defer && !defer) {
              throw new Error('Error: You are not suppose to mix deferred and non-deferred scripts in one block.');
            } else if (defer) {
              last.defer = true;
            } else {
              last.defer = false;
            }

            // preserve async attribute
            var async = / async/.test(l);
            if (async && last.async === false || last.async && !async) {
              throw new Error('Error: You are not suppose to mix asynced and non-asynced scripts in one block.');
            } else if (async) {
              last.async = true;
            } else {
              last.async = false;
            }

            // RequireJS uses a data-main attribute on the script tag to tell it
            // to load up the main entry point of the amp app
            //
            // If we find one, we must record the name of the main entry point,
            // as well the name of the destination file, and treat
            // the furnished requirejs as an asset (src)
            var main = l.match(/data-main=['"]([^"']*(?:{%).+(?:%})[^"']*|[^'"]+)['"]/);
            if (main) {
              throw new Error('require.js blocks are no more supported.');
            }
          }
        }
      }
      last.raw.push(l);
    }
  });

  return sections;
};


module.exports = function( filepath ) {

  this.dir = path.dirname(filepath);
  this.name = path.basename(filepath);
  // By default referenced content will be looked at relative to the location
  // of the file
  this.searchPath = [this.dir];
  this.content = fs.readFileSync(filepath).toString();

  // Let's parse !!!
  this.blocks = getBlocks(this.content);
};
