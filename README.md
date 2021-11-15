# node-job-scheduler
Hi!

### UML diagram
![image](https://user-images.githubusercontent.com/31515087/141787357-3fbd1b34-2afd-438d-a4c7-69b54eaccabf.png)

## Starting the project:
1. `docker-compose up -d` to start `localstack`
2. `npm install`
3. `npm start`

### This implementation consist 2 options for job schedulers
#### 1. In memory
#### 2. SQS based (closer to real production projects)

Both implementations inherits from EventEmitter and implements a common interface.

## Custom features
1. Seperation to "topics".
2. Retry mechanism: Abbility to **retry** if consumer handler failed. This can be achieved by passing `maxRetries` upon addition of a job.


### REST api (default port is 55551, can be changed in `scr/config.json`)
#### 1. Adding a job:
```bash
curl --request POST \
  --url http://localhost:55551/timers \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{ "hours": 0, "minutes": 0, "seconds": 200, "url": "https://someserver.com" }'
```

response: 
```json 
{ "id": "61925ffcf5fb7e8636a68654" }
```

#### 2. Getting seconds left until execution:
```bash
curl http://localhost:55551/timers/61925ffcf5fb7e8636a68654
```

response:
```json
{ "id": "6192613ca05b38d907601861", "time_left": 195.299 }
```

Basic usage (as shown in `src/scheduler.ts`:
```typescript
interface JobData {
  url: string;
}

// in memory based
const scheduler = new InMemoryJobScheduler<JobData>(topic);
// or sqs based
const scheduler = new SQSJobScheduler<JobData>(topic, options);
```

```javascript
await scheduler.init();
/*
  data is the specific data that was added to the job
  id the the job id
*/
scheduler.receive(({ data, id }) => axios.post(`${data.url}/${id}`));
```

To switch between SQS based scheduler and in memory scheduler just change `src/config.js`:
```json
"scheduler": {
    "type": "sqs"
}
```
