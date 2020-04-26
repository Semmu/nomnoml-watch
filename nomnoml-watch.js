#!/usr/bin/env node

const fs = require('fs')
const path = require('path');
const nomnoml = require('nomnoml');
const chokidar = require('chokidar');
const colors = require('colors');

// max import depth in nomnoml files
const MAX_IMPORT_DEPTH = 20 // 20 should be enough i guess

function read_file(filename, depth) {
  const absolute_path = path.resolve(filename);
  console.log(`[depth=${depth}] Reading file '${absolute_path}'...`);

  if (depth >= MAX_IMPORT_DEPTH) {
    console.error(`[depth=${depth}] Maximum import depth reached, can't read file '${absolute_path}'!`.red);
    return `#.nomnomlwatchmaxdepth: fill=orange visual=end
      [<nomnomlwatchmaxdepth> -]
    `;
  }

  try {
    const contents = fs
      .readFileSync(filename, { encoding: 'utf8' })
      .replace(/\s*#import:\s*([a-zA-Z0-9._-]*)(.*)/g, function (_, file_to_import, after_import_text) {
        return '\n' + read_file(path.dirname(filename) + '/' + file_to_import, depth + 1) + after_import_text;
    });

    console.log(`[depth=${depth}] Successfully read file '${absolute_path}'.`.green);
    return contents;

  } catch (e) {

    console.log(`[depth=${depth}] Error while reading file '${absolute_path}'!`.red);
    return `#.nomnomlwatchreaderror: fill=red visual=end
      [<nomnomlwatchreaderror> -]
    `;

  }
}

console.log('nomnoml-watch started, press Ctrl+C to exit...'.green);

chokidar.watch('*.nomnoml').on('all', (event, filename) => {
  if (['add', 'change'].includes(event)) {
    const absolute_path = path.resolve(filename);
    const output_filename = filename.split('.').slice(0, -1).join('.') + '.svg';

    console.log(`\nRendering file '${absolute_path}'...`.cyan);
    try {
      fs.writeFileSync(output_filename, nomnoml.renderSvg(read_file(absolute_path, 0)));
      console.log(`Successfully rendered file '${absolute_path}'!`.green);
    } catch (e) {
      console.log(`Error while rendering file '${absolute_path}'!`.red);
    }
  }
});