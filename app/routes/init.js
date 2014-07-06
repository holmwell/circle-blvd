var async = require('async');

var db        = require('../lib/dataAccess.js').instance();
var sslServer = require('../lib/https-server.js');
var settings  = require('../lib/settings.js');

exports.init = function (req, res, app) {
	var data = req.body;
	var defaultCircleId = "1";

	var handleOptionalSettings = function (err, fnCallback) {

		var tasks = [];

		if (ssl && ssl.certPath && ssl.certKey) {
			var sslSettings = [{
				name: "ssl-cert-path",
				value: ssl.certPath,
				visibility: "private"
			},{
				name: "ssl-key-path",
				value: ssl.certKey,
				visibility: "private"
			}];

			// ssl.caPath is optional
			if (ssl.caPath) {
				sslSettings.push({ 
					name: "ssl-ca-path",
					value: null,
					visibility: "private"
				});
			}
			
			tasks.push(function (callback) {
				settings.set(sslSettings, function (err) {
					if (err) {
						return callback(err);
					}
					sslServer.create(app, callback);
				});
			});
		}

		if (smtp && smtp.login && smtp.password) {
			// smtp.service is optional
			var smtpSettings = [{
				name: "smtp-login",
				value: smtp.login,
				visibility: "private"
			},{
				name: "smtp-password",
				value: smtp.password,
				visibility: "secret"
			}];

			if (smtp.service) {
				smtpSettings.push({
					name: "smtp-service",
					value: smtp.service,
					visibility: "private"
				});
			}

			tasks.push(function (callback) {
				settings.set(smtpSettings, callback);
			});
		}

		if (stripe && stripe.public && stripe.secret) {
			var stripeSettings = [{
				name: "stripe-public-key",
				value: null,
				visibility: "public"
			},{
				name: "stripe-secret-key",
				value: null,
				visibility: "secret"
			}];

			tasks.push(function (callback) {
				settings.set(stripeSettings, callback);
			});
		}

		if (tasks.length > 0) {
			async.parallel(tasks, fnCallback);
		}
		else {
			fnCallback();
		}
	};

	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		res.send(500, err);
	};

	// TODO: This should be consolidated with
	// the add-new-circle code in server.js
	var addNextMeeting = function () {
		var story = {};	
		story.projectId = defaultCircleId;
		story.summary = "Next meeting";
		story.isNextMeeting = true;

		db.stories.add(story, function (err, body) {
			if (err) {
				return onError(err);
			}
			return onSuccess(body);
		});
	};

	var adminMemberships = [];
	var addAdminUser = function (userGroup) {

		adminMemberships.push({
			circle: defaultCircleId,
			group: userGroup.id, // TODO: Config?
			level: "member"
		});

		var isReadOnly = false;
		db.users.add(
			"Admin", 
			data.email, 
			data.password, 
			adminMemberships,
			isReadOnly,
			addNextMeeting, onError
		);
	};

	var mainframeGroup = {
		name: "Mainframe",
		isPermanent: true
	};

	var firstCircle = {
		name: "Circle Blvd"
	};

	db.circles.add(firstCircle, function (err, newCircle) {
		defaultCircleId = newCircle._id;
		db.groups.add(mainframeGroup, function (rootGroup) {
			var adminGroup = {
				name: "Administrative",
				projectId: defaultCircleId,
				isPermanent: true
			};

			var impliedGroup = {
				name: "_implied",
				projectId: defaultCircleId,
				isPermanent: true
			};

			db.groups.add(impliedGroup, function (memberGroup) {
					adminMemberships.push({
						circle: defaultCircleId,
						group: memberGroup.id,
						level: "member"
					});
					adminMemberships.push({
						// no circle
						group: rootGroup.id,
						level: "member"
					});
					db.groups.add(adminGroup, addAdminUser, onError);
				}, onError);
		}, onError);
	});
};