import { remove, mkdirp } from 'fs-extra';

const DIST_FOLDER = './dist';

async function init(): Promise<void> {
  await remove(DIST_FOLDER);
  await mkdirp(DIST_FOLDER);
  console.log('Initialized dist folder');
}

init().catch((error) => {
  console.error('Build init failed:', error);
  process.exit(1);
});
