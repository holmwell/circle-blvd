// Routes for io
// /io

var express = require('express');
var router = express.Router();

var errors = require('@holmwell/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');
var request = require('request');

module.exports = function (db) {
	var settings = require('circle-blvd/settings')(db);

	router.post('/', function (req, res) {
		settings.get(guard(res, processSettings));

		function processSettings(settings) {
			var payload = JSON.parse(req.body.payload);
			var message = payload.original_message;

			var token = settings['slack-verification-token'].value;
			if (!payload || payload.token !== token) {
				res.status(400).send();
				return;
			}

			// console.log(payload);
			var action = payload.actions.shift();

			message.attachments[0] = {
				title: message.attachments[0].title,
				text: '<@' + payload.user.id + '> ' +
				'marked this task as *' + action.value + '*'
			};

			res.status(200).send(message);

			// TODO:
			// var dm = {};
			// request.post('https://slack.com/api/chat.postMessage', dm);
		}
	});

	return {
		router: router
	};
};