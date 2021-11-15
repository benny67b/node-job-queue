import { start } from 'server';
import { initStorage } from 'storage';

(async () => {
  await initStorage();
  await start();
})();
