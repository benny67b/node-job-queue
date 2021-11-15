import { DocumentType } from '@typegoose/typegoose';
import { Job as Model } from 'models/job';

export interface Job<T = any> {
  id: string;
  executeAt: Date;
  data: T;
}

export type JobExecuteFn<T> = (job: Job<T>) => void | Promise<void>;
export type JobModel<T> = DocumentType<Model<T>>;

export const jobFiredEventName = 'job-execution';

type JobOptionsBase = { maxRetries?: number };
export type JobOptions = 
 | { executeAt: Date; delay?: number; } & JobOptionsBase
 | { executeAt?: Date; delay: number; } & JobOptionsBase;

export interface JobScheduler<T> {
  init(): Promise<void>;
  add(data: T, options: JobOptions): Promise<Job<T>>;
  receive(callback: JobExecuteFn<T>): void;
  get(jobId: string): Promise<Job<T> & { isExecuted: boolean }>;
}
