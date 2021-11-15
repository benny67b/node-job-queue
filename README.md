# node-job-scheduler

Hi!

### This implementation consist 2 options for job schedulers
1. In memory
2. SQS based (closer to real production projects)

Both implementations inherits from EventEmitter and implements a common interface.

Basic usage:
```javascript
const scheduler = new InMemoryJobScheduler<JobData>(topic);
await scheduler.init();
/*
  data is the specific data that was added to the job
  id the the job id
*/
scheduler.receive(({ data, id }) => axios.post(`${data.url}/${id}`));
```


![image](https://user-images.githubusercontent.com/31515087/141787357-3fbd1b34-2afd-438d-a4c7-69b54eaccabf.png)
