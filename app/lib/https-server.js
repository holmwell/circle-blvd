// https-server.js
var fs    = require('fs');
var https = require('https');

var db = {};
db.settings = require('./data-settings.js');

var httpsServer = undefined;

var getServerOptions = function (callback) {
	
	db.settings.getAll(function (settings) {
		var sslKeyPath = settings['ssl-key-path'] ? settings['ssl-key-path'].value : undefined;
		var sslCertPath = settings['ssl-cert-path'] ? settings['ssl-cert-path'].value : undefined;
		var sslCaPath = settings['ssl-ca-path'] ? settings['ssl-ca-path'].value : undefined;
		
		var options = undefined;

		try {
			if (sslKeyPath && sslCertPath) {
				if (sslCaPath) {
					// TODO: It would be nice to restart the server if we
					// find ourselves with a new sslCaPath and we're already up.
					options = {
						key: fs.readFileSync(sslKeyPath),
						cert: fs.readFileSync(sslCertPath),
						ca: fs.readFileSync(sslCaPath)
					};	
				}
				else {
					options = {
						key: fs.readFileSync(sslKeyPath),
						cert: fs.readFileSync(sslCertPath)
					};	
				}
			}
		}
		catch (err) {
			callback(err);
			return;
		}

		callback(null, options);
	});
};

var tryToCreateHttpsServer = function (app, callback) {
	
	getServerOptions(function (err, options) {
		if (err) {
			return callback(err);
		}

		if (options) {
			// TODO: It would be nice to turn off the https server when new settings are
			// presented. For now, just turning on is good enough.
			if (httpsServer) {
				if (callback) {
					callback("The https server is already running. It's best to restart the app.");
					return;
				}
			}

			httpsServer = https.createServer(options, app);
			httpsServer.listen(app.get('ssl-port'), function () {
				if (callback) {
					callback(null, "Express https server listening on port " + app.get('ssl-port'));
				}
			});
		}
		else if (callback) {
			callback("No SSL settings found. Did not create https server.");
		}
	});	
};

module.exports = function () {
	return {
		isRunning: function () {
			return httpsServer ? true : false;
		},
		create: tryToCreateHttpsServer
	};
}(); // closure