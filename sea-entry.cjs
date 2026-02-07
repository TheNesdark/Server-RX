const path = require('path');
const { pathToFileURL } = require('url');

// En SEA, process.execPath apunta al .exe
const exeDir = path.dirname(process.execPath);
process.chdir(exeDir);
process.env.NODE_ENV = 'production';

const entryPath = path.join(exeDir, 'dist', 'server', 'entry.mjs');
import(pathToFileURL(entryPath).href).catch(err => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
