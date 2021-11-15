import { InMemoryJobScheduler } from 'job-scheduler-providers/in-memory';
import axios from 'axios';
import { SQSInitOptions, SQSJobScheduler } from 'job-scheduler-providers/sqs';
import config from 'config';
import { JobScheduler } from 'job-scheduler-providers/base';

interface JobData {
  url: string;
}

enum SchedulerType {
  sqs = 'sqs',
  inMemory = 'inMemory'
}

type SchedulerInitOptions = SQSInitOptions;

const schedulerFactory: {[key in SchedulerType]: (topic: string, options: SchedulerInitOptions) => JobScheduler<JobData>} = {
  [SchedulerType.sqs]: (topic, options) => new SQSJobScheduler<JobData>(topic, options),
  [SchedulerType.inMemory]: (topic) => new InMemoryJobScheduler<JobData>(topic)
}

export let scheduler: JobScheduler<JobData>;

export async function init() {
  const { type, options } = config.scheduler;
  console.log('Starting scheduler: ', { type });
  const schedulerInitFn = schedulerFactory[type as SchedulerType];
  scheduler = schedulerInitFn('api-sender', options);
  await scheduler.init();
  scheduler.receive(({ data, id }) => axios.post(`${data.url}/${id}`));
}
