import express from 'express';
import cors from 'cors';
import jobRouter from './job';
import config from '../config';
import { init as initScheduler } from 'scheduler';

const port = config.server.port;
const app = express();

app.use(cors());
app.use(express.json());
app.use('/timers', jobRouter);

export async function start() {
  
  await initScheduler();
  return await new Promise<void>(( resolve ) => {
    app.listen(port, () => {
      console.log(`server started on ${port}`);
      resolve()
    });
  })
  
}
