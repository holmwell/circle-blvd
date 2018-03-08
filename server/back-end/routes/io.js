// Routes for io
// /io

var express = require('express');
var router = express.Router();

var errors = require('@holmwell/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');

module.exports = function (db) {
	var limits = require('circle-blvd/limits')(db);
	var notify = require('circle-blvd/notify')(db);

	router.post('/', function (req, res) {
		var payload = JSON.parse(req.body.payload);
		var message = payload.original_message;

		//console.log(payload);
		//console.log(message);
		var action = payload.actions.shift();

		message.attachments[0] = {
			title: message.attachments[0].title,
			text: '<@' + payload.user.id + '> ' +
			'marked this task as *' + action.value + '*'
		};

		res.status(200).send(message);
	});

	return {
		router: router
	};
};