
var index = require('../routes/index');

module.exports = function(app) {
	app.get('/', index.home);
	app.get('/track', index.track);
	app.get('/stoptrack', index.stoptrack);
	app.get('/getstatus', index.getstatus);
}