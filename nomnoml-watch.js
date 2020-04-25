const chokidar = require('chokidar');

// One-liner for current directory
chokidar.watch('*.js').on('all', (event, path) => {
  console.log(event, path);
});