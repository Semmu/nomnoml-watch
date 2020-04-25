#!/usr/bin/env node
const fs = require('fs')
const path = require('path');
const nomnoml = require('nomnoml');
const chokidar = require('chokidar');
const color = require('cli-color');

// max import depth in nomnoml files
const MAX_IMPORT_DEPTH = 20 // 20 should be enough i guess

function read_file(filename, depth) {
  const absolute_path = path.resolve(filename);
  console.log(`[depth=${depth}] Reading file '${absolute_path}'...`);

  if (depth >= MAX_IMPORT_DEPTH) {
    console.error(color.red(`[depth=${depth}] Maximum import depth reached, can't read file '${absolute_path}'!`));
    return `#.nomnomlwatchmaxdepth: fill=orange visual=end
      [<nomnomlwatchmaxdepth> -]
    `;
  }

  try {
    const contents = fs
      .readFileSync(filename, { encoding: 'utf8' })
      .replace(/(.*)#import:(.*)/g, function (_, _, file_to_import) {
        return read_file(path.dirname(filename) + '/' + file_to_import.trim(), depth + 1);
    });

    console.log(color.green(`[depth=${depth}] Successfully read file '${absolute_path}'.`));
    return contents;

  } catch (e) {

    console.log(color.red(`[depth=${depth}] Error while reading file '${absolute_path}'!`));
    return `#.nomnomlwatchreaderror: fill=red visual=end
      [<nomnomlwatchreaderror> -]
    `;

  }
}

chokidar.watch('*.nomnoml').on('all', (event, filename) => {
  if (['add', 'change'].includes(event)) {
    const absolute_path = path.resolve(filename);
    const output_filename = filename.split('.').slice(0, -1).join('.') + '.svg';

    console.log(`\nRendering file '${absolute_path}'...`);
    try {
      fs.writeFileSync(output_filename, nomnoml.renderSvg(read_file(absolute_path, 0)));
      console.log(color.green(`Successfully rendered file '${absolute_path}'!`));
    } catch (e) {
      console.log(color.green(`Error while rendering file '${absolute_path}'!`));
    }
  }
});