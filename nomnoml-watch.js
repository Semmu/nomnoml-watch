#!/usr/bin/env node
var fs = require('fs')
var path = require('path');
const nomnoml = require('nomnoml');
const chokidar = require('chokidar');

// max import depth in nomnoml files
const MAX_IMPORT_DEPTH = 1

function read_file(filename, depth) {
  const absolute_path = path.resolve(filename);
  console.log(`[depth=${depth}] Reading file '${absolute_path}'...`);

  if (depth >= MAX_IMPORT_DEPTH) {

    console.error(`[depth=${depth}] Maximum import depth reached, can't read file '${absolute_path}'!`);

    return `#.error: fill=#e52361 bold
      [<end> end]<--[ <error> ${path.basename(absolute_path)} |
      Error: maximum import depth reached!
    ]`;
  }

  const contents = fs.readFileSync(filename, { encoding: 'utf8' })
    .replace(/#import:*(.*)/g, function (_, file_to_import) {
      return read_file(path.dirname(filename) + '/' + file_to_import.trim(), depth + 1);
  });

  console.log(`[depth=${depth}] Successfully read file '${absolute_path}'.`);

  return contents;
}
// One-liner for current directory
chokidar.watch('*.js').on('all', (event, path) => {
  console.log(event, path);
});