// Routes for oauth
// /oauth
var express = require('express');
var router = express.Router();

var errors = require('@holmwell/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');

var request = require('request');

module.exports = function (db) {

	var settings = require('circle-blvd/settings')(db);

	router.get('/slack', ensure.auth, function (req, res) {
		var payload = req.query;

		if (payload.state && payload.code) {
			// Verify that we have access to the circle 
			// specified in state
			var memberships = req.user.memberships;
			for (var index in memberships) {
				if (memberships[index].circle === payload.state) {
					settings.get(guard(res, processSettings));
					return;
				}
			}
		}

		function processSettings(settings) {
			// Get Slack access, save the tokens
			var oauthUrl = [
				'https://slack.com/api/oauth.access',
				'?client_id=', 
				settings['slack-client-id'].value,
				'&client_secret=',
				settings['slack-client-secret'].value,
				'&code=', 
				payload.code
			].join('');

			request.get(oauthUrl, handleOauthReply);
		}

		function handleOauthReply(err, httpResponse, body) {
			var access = JSON.parse(body);
			if (access && access.ok) {
				var circleId = payload.state;
				db.circles.get(circleId, guard(res, function (circle) {
					circle.access = circle.access || {};
					circle.access.slack = access;

					circle.webhooks = circle.webhooks || {};
					circle.webhooks.slack = circle.webhooks.slack || {};
					circle.webhooks.slack.url = access.incoming_webhook.url;

					db.circles.update(circle, guard(res, function () {
						res.redirect('/#/');
					}));
				}));
			}
			else {
				// Didn't work out
				console.log(err);
				res.redirect('/#/');
			}
		}

		// fallback / invalid request
		res.redirect('/#/');
	});

	return {
		router: router
	};
};