import { createJob, getAllFutureJobs, getJob, Job, markJobExecuted, incRetries} from 'models/job';
import { JobScheduler, JobOptions, JobExecuteFn, JobModel, jobFiredEventName } from './base';
import { EventEmitter } from 'events';

export class InMemoryJobScheduler<T> extends EventEmitter implements JobScheduler<T> {

  private topic: string;

  constructor(topic: string) {
    super();

    this.topic = topic;
  }

  private defineJob(job: JobModel<T>, executeAt: Date) {
    const delay = executeAt.getTime() - Date.now();

    setTimeout(() => {
      this.emit(jobFiredEventName, job);
    }, delay);
  }

  async init() {
    for await (const job of getAllFutureJobs(this.topic)) {
      const isExecutionTimePassed = Date.now() - job.executeAt.getTime() > 0;
      this.defineJob(job as JobModel<T>, isExecutionTimePassed ? new Date() : job.executeAt);
    }
  }

  private async handleJob(job: JobModel<T>, callback: JobExecuteFn<T>) {
    try {
      return await callback(job);
    }
    catch (error) {
      console.error('Job error: ', error);
      const jobAfterRetryInc = await incRetries(job);
      if (jobAfterRetryInc) {
        console.error(`Retrying job id: ${job.id}, retry number: ${jobAfterRetryInc.retries} / ${job.maxRetries}`);
        return await this.handleJob(job, callback);
      }
      return;
    }
  }

  async receive(callback: JobExecuteFn<T>) {
    this.on(jobFiredEventName, async (job: JobModel<T>) => {
      await this.handleJob(job, callback);
      await markJobExecuted(job);
    });
  };

  async add(data: T, options: JobOptions) {
    const executeAt = options.executeAt || new Date(Date.now() + options.delay);
    const job = new Job(data, executeAt);
    
    const createdJob = await createJob({ ...job, topic: this.topic, maxRetries: options.maxRetries || 0 });
    this.defineJob(createdJob, executeAt);

    return createdJob;
  }

  async get(jobId: string) {
    const job = await getJob<T>(jobId);

    if (!job) return null;
    
    return {
      id: job.id,
      isExecuted: job.isExecuted,
      executeAt: job.executeAt,
      data: job.data
    }
  }
}

