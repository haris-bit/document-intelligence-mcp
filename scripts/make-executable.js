
import { chmod } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const indexPath = join(__dirname, '..', 'dist', 'index.js');

try {
  await chmod(indexPath, '755');
  console.log('Made dist/index.js executable');
} catch (error) {
  console.error('Error making file executable:', error);
}