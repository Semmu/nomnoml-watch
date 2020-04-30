#!/usr/bin/env node

const fs = require('fs')
const path = require('path');
const nomnoml = require('nomnoml');
const chokidar = require('chokidar');
const colors = require('colors');
const { program } = require('commander');
const glob = require('glob');

const this_package = require('./package.json'); // we need our own version

const MAX_IMPORT_DEPTH_DEFAULT = 20;

// setting up cli argument parsing
program.version(this_package.version);
program.option('-1, --once', 'run only once and then exit', false)
       .option('-d, --import-depth <type>', 'maximum depth allowed when importing external files', MAX_IMPORT_DEPTH_DEFAULT);

program.parse(process.argv);

// sanitizing import depth parameter value
const import_parameter_is_numeric = !isNaN(parseInt(program.importDepth));
const MAX_IMPORT_DEPTH = import_parameter_is_numeric ? parseInt(program.importDepth) : MAX_IMPORT_DEPTH_DEFAULT;
if (!import_parameter_is_numeric) {
  console.error(`Warning! Could not parse --import-depth parameter integer value. Using default value: ${MAX_IMPORT_DEPTH_DEFAULT}`.red)
}

/**
 * Reads a .nomnoml file and handles #import directives.
 *
 * @param      {String}  filename       The nomnoml file to read
 * @param      {number}  current_depth  The current depth while handling imports
 */
function read_file(filename, current_depth) {
  const absolute_path = path.resolve(filename);
  console.log(`[depth=${current_depth}] Reading file '${absolute_path}'...`);

  if (current_depth > MAX_IMPORT_DEPTH) {
    console.error(`[depth=${current_depth}] Maximum import depth reached, won't import file '${absolute_path}'!`.red);
    return `#.nomnomlwatchmaxdepth: fill=orange visual=end
      [<nomnomlwatchmaxdepth> -]
    `;
  }

  try {
    const contents = fs
      .readFileSync(filename, { encoding: 'utf8' })
      .replace(/\s*#import:\s*([a-zA-Z0-9._-]*)(.*)/g, function (_, file_to_import, after_import_text) {
        return '\n' + read_file(path.dirname(filename) + '/' + file_to_import, current_depth + 1) + after_import_text;
    });

    console.log(`[depth=${current_depth}] Successfully read file '${absolute_path}'.`.green);
    return contents;

  } catch (e) {

    console.log(`[depth=${current_depth}] Error while reading file '${absolute_path}'!`.red);
    return `#.nomnomlwatchreaderror: fill=red visual=end
      [<nomnomlwatchreaderror> -]
    `;
  }
}

/**
 * Renders a .nomnoml file into an SVG image with the same name.
 *
 * @param      {String}  filename  The nomnoml file to render
 */
function render_file(filename) {
  const absolute_path = path.resolve(filename);
  const output_filename = filename.split('.').slice(0, -1).join('.') + '.svg';
  const absolute_output_filename = path.resolve(output_filename);

  console.log(`\nRendering file '${absolute_path}'...`.cyan);
  try {
    fs.writeFileSync(output_filename, nomnoml.renderSvg(read_file(absolute_path, 0)));
    console.log(`Successfully rendered file '${absolute_output_filename}'!`.green);
  } catch (e) {
    console.log(`Error while rendering file '${absolute_path}'!`.red);
  }
}

if (program.once) {

  console.log('nomnoml-watch starting, will exit after rendering all the files...'.green);
  glob.sync('./*.nomnoml', {}).forEach((filename) => {
    render_file(filename);
  });
  console.log('\nnomnoml-watch rendered all the files, bye!'.green);

} else {

  console.log('nomnoml-watch started, press Ctrl+C to exit...'.green);

  // this is async!
  chokidar.watch('*.nomnoml').on('all', (event, filename) => {
    if (['add', 'change'].includes(event)) {
      render_file(filename);
    }
  });

  process.on('SIGINT', () => {
    console.log('\nnomnoml-watch exiting, bye!'.green);
    process.exit();
  });
}