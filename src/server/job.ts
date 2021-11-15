import express, { Request, Response } from 'express';
import { scheduler } from 'scheduler';
import { toMilliseconds } from 'utils';

const router = express.Router();

interface ScheduleJobReqBody {
  url: string;
  hours: number;
  minutes: number;
  seconds: number;
}

router.post('/', async (req: Request<{}, {}, ScheduleJobReqBody>, res: Response) => {
  const { url, hours, minutes, seconds } = req.body;
  
  const scheduledJob = await scheduler.add({ url }, { 
    delay: toMilliseconds(hours, minutes, seconds),
    maxRetries: 1
  });

  res.json({ id: scheduledJob.id });
});

router.get('/:id', async (req, res) => {
  const job = await scheduler.get(req.params.id);

  res.json({
    id: job.id,
    time_left: job.isExecuted ? 0 : (job.executeAt.getTime() - Date.now()) / 1000,
  });
});

export default router;
