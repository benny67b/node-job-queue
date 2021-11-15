import { getModelForClass, modelOptions, prop, Severity, DocumentType } from '@typegoose/typegoose';
import { TimeStamps, Base } from '@typegoose/typegoose/lib/defaultClasses';
import { ChangeStream, ChangeStreamDocument } from 'mongodb';

export interface Job<T> extends Base {}

@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class Job<T> extends TimeStamps  {

  constructor(data: T, executeAt: Date) {
    super();
    this.executeAt = executeAt;
    this.data = data;
  }

  @prop({ default: false })
  isExecuted: boolean;

  @prop()
  executeAt: Date;

  @prop()
  data: T;

  @prop()
  topic: string;

  @prop({ default: 0 })
  retries: number;

  @prop({ default: 0 })
  maxRetries: number;

  @prop({ default: false })
  isProcessed: boolean;

}

const JobModel = getModelForClass(Job);

export async function createJob<T>(job: Job<T>) {
  return (await JobModel.create(job)) as DocumentType<Job<T>>;
}

export async function incRetries<T>(job: Job<T>) {
  if (job.retries < job.maxRetries) {
    job.retries += 1;
    return await JobModel.findByIdAndUpdate(job.id, { $inc: { retries: 1 } }, { new: true });
  }

  return null;
}

export async function markJobExecuted<T>(job: Job<T>) {
  return await JobModel.findByIdAndUpdate(job._id, { $set: { isExecuted: true , isProcessed: true} }); 
}

export async function getJob<T>(jobId: string) {
  return (await JobModel.findById(jobId)).toObject<Job<T>>({ getters: true }); 
}

export function getAllFutureJobs(topic: string) {
  return JobModel.find({ isExecuted: false, topic });
}

export function getUnprocessedJobsInTimeframe(topic: string, date: Date) {
  return JobModel.find({ 
    isProcessed: false,
    executeAt: { $lt: date },
    topic 
  });
}

export function subscribeToJobsInserts<T>(callback: (doc: Omit<Job<T>, 'incRetries'>) => void) {
  const changeStream = JobModel.watch() as ChangeStream<Job<T>>;

  changeStream.on('change', (doc: ChangeStreamDocument<Job<T>>) => {
    if (doc.operationType === 'insert') {
      callback({ id: doc.fullDocument._id.toString(), ...doc.fullDocument });
    }
  });
}

export async function markProcessed(jobId: string) {
  return await JobModel.findByIdAndUpdate(jobId, { $set: { isProcessed: true } });
}
