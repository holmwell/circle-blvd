var async = require('async');
var guard = require('@holmwell/errors').guard;

exports.init = function (req, res, app, db) {
	var settings  = require('circle-blvd/settings')(db);
	var sslServer = require('circle-blvd/https-server')(settings);
	var data      = req.body;

	var admin  = data.admin;
	var ssl    = data.ssl;
	var smtp   = data.smtp;
	var contact = data.contact;
	var stripe = data.stripe;

	var defaultCircleId = "1";

	var handleOptionalSettings = function (fnCallback) {
		var tasks = [];
		settings.get(guard(fnCallback, function (defaultSettings) {

			if (ssl && ssl.certPath && ssl.certKey) {
				var sslSettings = [];

				var certPath = defaultSettings['ssl-cert-path'];
				certPath.value = ssl.certPath;

				var certKey = defaultSettings['ssl-key-path'];
				certKey.value = ssl.certKey;

				sslSettings.push(certPath);
				sslSettings.push(certKey);

				// ssl.caPath is optional
				if (ssl.caPath) {
					var caPath = defaultSettings['ssl-ca-path'];
					caPath.value = ssl.caPath;
					sslSettings.push(caPath);
				}
				
				tasks.push(function (callback) {
					settings.set(sslSettings, guard(callback, function () {
						sslServer.create(app, function (err) {
							errors.log(err);
							return callback("The HTTPS server could not be started.");
						});
					}));
				});
			}

			if (smtp && smtp.login && smtp.password) {
				// smtp.service is optional
				var smtpSettings = [];

				var smtpLogin = defaultSettings['smtp-login'];
				smtpLogin.value = smtp.login;

				var smtpPassword = defaultSettings['smtp-password'];
				smtpPassword.value = smtp.password;

				smtpSettings.push(smtpLogin);
				smtpSettings.push(smtpPassword);

				if (smtp.service) {
					var smtpService = defaultSettings['smtp-service'];
					smtpService.value = smtp.service;
					smtpSettings.push(smtpService);
				}

				tasks.push(function (callback) {
					settings.set(smtpSettings, callback);
				});
			}

			if (contact) {
				var contactSettings = [];

				if (contact.to) {
					var contactTo = defaultSettings['contact-to-address'];
					contactTo.value = contact.to;
					contactSettings.push(contactTo);	
				}

				if (contact.from) {
					var contactFrom = defaultSettings['contact-from-address'];
					contactFrom.value = contact.from;
					contactSettings.push(contactFrom);
				}

				if (contactSettings.length > 0) {
					tasks.push(function (callback) {
						settings.set(contactSettings, callback);
					});
				}
			}

			if (stripe && stripe.public && stripe.secret) {
				var stripeSettings = [];

				var stripePublic = defaultSettings['stripe-public-key'];
				stripePublic.value = stripe.public;

				var stripeSecret = defaultSettings['stripe-secret-key'];
				stripeSecret.value = stripe.secret;

				stripeSettings.push(stripePublic);
				stripeSettings.push(stripeSecret);

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
		}));
	};

	var handleOptionalError = function (err) {
		res.status(500).send({
			code: 2,
			error: err
		});
	};

	var handleOptionsCallback = function (err) {
		if (err) {
			return handleOptionalError(err);
		}
		return onSuccess();
	};

	var onSuccess = function() {
		res.sendStatus(200);
	};

	var onError = function (err) {
		res.status(500).send({
			code: 1,
			error: err
		});
	};

	// TODO: This should be consolidated with
	// the add-new-circle code in server.js
	var addNextMeeting = function () {
		var story = {};	
		story.projectId = defaultCircleId;
		story.summary = "Next";
		story.isNextMeeting = true;

		db.stories.add(story, guard(onError, function (body) {
			return handleOptionalSettings(handleOptionsCallback);
		}));
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
			admin.email, 
			admin.password, 
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

	db.circles.add(firstCircle, guard(onError, function (newCircle) {
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
	}));
};