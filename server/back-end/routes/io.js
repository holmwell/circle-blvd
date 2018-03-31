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

			// console.log("Payload:");
			// console.log(payload);

			var action = payload.actions.shift();

			message.attachments[0] = {
				title: message.attachments[0].title,
				text: '<@' + payload.user.id + '> ' +
				'marked this task as *' + action.name + '*'
			};

			res.status(200).send(message);

			db.docs.get(payload.callback_id, function (err, story) {
				if (!story.owner) {
					story.owner = payload.user.name;
				}
				story.status = action.value;
				db.stories.save(story, afterStorySave);
			});

			function afterStorySave() {
				if (action.name !== "On it" && action.name !== "Will do") {
					return;
				}

				// Send more messages to Slack if needed
				db.circles.getBySlackTeamId(payload.team.id, function (err, circle) {
					if (err) {
						errors.log(err);
						return;
					}

					var dm = {
						token: circle.access.slack.bot.bot_access_token
					};

					db.docs.get(payload.callback_id, function (err, story) {
						request.post('https://slack.com/api/im.open', {
							json: true,
							form: {
								token: dm.token,
								user: payload.user.id
							}
						}, function (err, response, body) {
							if (body.ok) {
								request.post('https://slack.com/api/chat.postMessage', {
									json: true,
									form: {
										token: dm.token,
										channel: body.channel.id,
										text: "When you're done with this task, please let us know",
										attachments: JSON.stringify([{
											title: story.summary,
											fallback: "",
											callback_id: payload.callback_id,
											attachment_type: "default",
											actions: [
											{
												name: "Done",
												style: "primary",
												text: "Done",
												type: "button",
												value: "done"
											},{
												name: "Not going to happen",
												text: "Not going to happen",
												type: "button",
												value: "sad"
											}]
										}])
									}
								}, function (err, response, body) {
									console.log(err);
									console.log(body);
								});
							}
							else {
								console.log(err);
								console.log(body);
							}
						});

					});
				});
			}
		}
	});

	return {
		router: router
	};
};