# node-job-scheduler

Hi!

## Starting the project:
1. `docker-compose up -d` to start `localstack`
2. `npm install`
3. `npm start`

### This implementation consist 2 options for job schedulers
1. In memory
2. SQS based (closer to real production projects)

Both implementations inherits from EventEmitter and implements a common interface.

### REST api (default port is 55551, can be changed in `scr/config/js`)
1. Adding a job:
```bash
curl --request POST \
  --url http://localhost:55551/timers \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
	"hours": 0, 
	"minutes": 0, 
	"seconds": 3, 
	"url": "https://someserver.com"
}'
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

# UML diagram
![image](https://user-images.githubusercontent.com/31515087/141787357-3fbd1b34-2afd-438d-a4c7-69b54eaccabf.png)
