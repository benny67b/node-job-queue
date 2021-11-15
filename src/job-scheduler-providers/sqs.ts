import { JobExecuteFn, jobFiredEventName, JobModel, JobOptions, JobScheduler } from './base';
import * as AWS from 'aws-sdk';
import EventEmitter from 'events';
import { createJob, getJob, getUnprocessedJobsInTimeframe, incRetries, Job, markJobExecuted, markProcessed, subscribeToJobsInserts } from 'models/job';
import { Consumer } from 'sqs-consumer';

export interface SQSInitOptions {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  endpoint?: string;
}

export class SQSJobScheduler<T> extends EventEmitter implements JobScheduler<T>  {

  private sqsClient: AWS.SQS;
  private topic: string;
  private queueUrl: string;
  private dbJobCollectorInterval: number = 30000;//600_000; // 10 mins

  constructor(topic: string, sqsOptions: SQSInitOptions) {
    super();

    AWS.config.update(sqsOptions);
    this.topic = topic;
    this.sqsClient = new AWS.SQS(sqsOptions);
  }

  async init() {
    const { QueueUrl } = await this.sqsClient.createQueue({ QueueName: `job-scheduler-${this.topic}` }).promise();
    this.queueUrl = QueueUrl;

    setInterval(async () => {
      const dateIn15Mins = new Date(Date.now() + this.dbJobCollectorInterval);
      for await (const job of getUnprocessedJobsInTimeframe(this.topic, dateIn15Mins)) {
        this.defineJob(job as JobModel<T>);
      }
    }, this.dbJobCollectorInterval);

    subscribeToJobsInserts<T>(job => {
      if ((job.executeAt.getTime() - Date.now()) < this.dbJobCollectorInterval) {
        this.defineJob(job);
      }
    });
  }

  private async defineJob(job: Job<T>) {
    console.log('Adding job: ', job);
    const delay = job.executeAt.getTime() - Date.now();
    await markProcessed(job.id);

    const response = await this.sqsClient.sendMessage({
      QueueUrl: this.queueUrl,
      DelaySeconds: delay / 1000,
      MessageBody: JSON.stringify(job)
     }).promise();

     return response;

  }

  async add(data: T, options: JobOptions) {
    const executeAt = options.executeAt || new Date(Date.now() + options.delay);
    const job = new Job(data, executeAt);
    
    const createdJob = await createJob({ ...job, topic: this.topic, maxRetries: options.maxRetries || 0 });
    return createdJob;
  }

  private async handleJob(job: JobModel<T>, callback: JobExecuteFn<T>) {
    try {
      return await callback(job);
    }
    catch (error) {
      console.error('Job error: ', error);
      const jobAfterRetryInc = await incRetries(job);
      if (jobAfterRetryInc) {
        console.error(`Retrying job id: ${job.id}, retry number: ${jobAfterRetryInc.retries} / ${jobAfterRetryInc.maxRetries}`);
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
    
    Consumer.create({
      queueUrl: this.queueUrl,
      handleMessage: async (message) => {
        const messageData = JSON.parse(message.Body) as JobModel<T>;
        this.emit(jobFiredEventName, messageData);
      }
    }).start();

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
