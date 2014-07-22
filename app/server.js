// server.js
var app = require('./app.js');

var start = function () {
	app.startServer();
};

app.whenReady(start);