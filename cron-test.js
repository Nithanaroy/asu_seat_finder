var global = 'apple';
var CronJob = require('cron').CronJob;
var job = new CronJob({
  cronTime: '* * * * * *',
  onTick: function() {
  	console.log('Global: ', global, new Date());
  },
  start: false,
  timeZone: "America/Los_Angeles"
});
job.start();

setTimeout(function() {
	// stop the job
	console.log('Stopping the Job');
	job.stop();
}, 3000);