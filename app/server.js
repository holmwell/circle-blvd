var express  = require('express');
var http     = require('http');
var https    = require('https');
var fs       = require('fs');
var request  = require('request');
var path     = require('path');
var uuid     = require('node-uuid');
var mailer   = require('nodemailer');
var routes   = require('./routes')
var auth     = require('./lib/auth.js');
var db       = require('./lib/dataAccess.js').instance();

var usersRoutes = require('./routes/users');
var userRoutes 	= require('./routes/user');
var initRoutes 	= require('./routes/init');

var app = express();

var initAuthentication = function () {
	auth.usernameField('email');
	auth.passwordField('password');
	app.use(auth.initialize());
	// Use passport.session() middleware to support
	// persistent login sessions.
	app.use(auth.session());
};

// Error handling.
var logError = function (err) {
	console.log(err);
};

var handleError = function (err, res) {
	var message = err.message || "Internal server error";
	var status = err.status || 500;
	logError(err);
	res.send(status, message);
};

// Authentication. 
var ensureAuthenticated = function (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.send(401, "Please authenticate with the server and try again.");
};

var ensureIsGroup = function (groupName, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + groupName + " group.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].name === groupName) {
				return next();
			}
		}
	}

	return nope();
};

var ensureAdministrator = function (req, res, next) {
	ensureAuthenticated(req, res, function () {
		ensureIsGroup("Administrative", req, res, next);
	});
};

var ensureMainframeAccess = function (req, res, next) {
	ensureAuthenticated(req, res, function () {
		ensureIsGroup("Mainframe", req, res, next);
	});
};

var ensureIsCircle = function (circleId, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + circleId + " circle.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].circle === circleId) {
				return next();
			}
		}
	}

	return nope();
};

var ensureIsCircleAdmin = function (circleId, req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the " + circleId + " circle.")
	}

	if (req.user.memberships) {
		var groups = req.user.memberships;
		for (var groupKey in groups) {
			if (groups[groupKey].circle === circleId
				&& groups[groupKey].name === "Administrative") {
				return next();
			}
		}
	}

	return nope();
};

var ensureAdminCircleAccess = function (req, res, next) {
	var circleId = req.params.circleId;
	if (!circleId) {
		return res.send(400, "Circle ID is required.");
	}

	ensureAuthenticated(req, res, function () {
		ensureIsCircleAdmin(circleId, req, res, next);
	});
};

var ensureCircleAccess = function (req, res, next) {
	var circleId = req.params.circleId;
	if (!circleId) {
		return res.send(400, "Circle ID is required.");
	}

	ensureAuthenticated(req, res, function () {
		ensureIsCircle(circleId, req, res, next);
	});
};

var authenticateLocal = function(req, res, next) {
	var success = function() {
		var dbUser = req.user;
		var publicUser = {};

		publicUser.id = dbUser.id;
		publicUser.email = dbUser.email;
		publicUser.name = dbUser.name;
		publicUser.memberships = dbUser.memberships;
		publicUser.notifications = dbUser.notifications;

		res.send(200, publicUser);
	};

	var failure = function(error) {
		logError(error);
		res.send(401, "Unauthorized"); 
	};

	var middleware = auth.local(req, success, failure);
	middleware(req, res, next);
};

var httpsServer = undefined;
var tryToCreateHttpsServer = function (callback) {
	db.settings.getAll(function (settings) {
		var sslKeyPath = settings['ssl-key-path'] ? settings['ssl-key-path'].value : undefined;
		var sslCertPath = settings['ssl-cert-path'] ? settings['ssl-cert-path'].value : undefined;
		var sslCaPath = settings['ssl-ca-path'] ? settings['ssl-ca-path'].value : undefined;
		
		var options = undefined;

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

var configureSuccessful = function () {
	// TODO: Require https (for passwords)
	app.post('/auth/signin', authenticateLocal);

	app.get('/auth/signout', function (req, res) {
		req.logout();
		res.send(204); // no content
	});

	// Data API: Protected by authorization system

	// Users routes (global actions. requires admin access)
	
	// TODO: Mainframe-access only, when the time comes.
	// app.get("/data/users", ensureAdministrator, usersRoutes.list);
	// app.post("/data/user", ensureAdministrator, usersRoutes.add);
	// app.put("/data/user/remove", ensureAdministrator, usersRoutes.remove);
	
	// User routes (account actions. requires login access)
	app.get("/data/user", ensureAuthenticated, userRoutes.user);
	app.put("/data/user", ensureAuthenticated, userRoutes.update);
	app.put("/data/user/password", ensureAuthenticated, userRoutes.updatePassword);

	// User routes (circle actions. requires admin access)
	app.get("/data/:circleId/users", ensureAdminCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		db.users.findByCircleId(circleId, function (err, users) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, users);
		});
	});

	app.put("/data/:circleId/user/remove", ensureAdminCircleAccess, function (req, res) {
		// usersRoutes.remove
		var circleId = req.params.circleId;
		var reqUser = req.body;

		db.users.findById(reqUser.id, function (err, user) {
			if (err) {
				return handleError(err, res);
			}

			var newMemberships = [];
			user.memberships.forEach(function (membership) {
				if (membership.circle === circleId) {
					// do nothing
				}
				else {
					newMemberships.push(membership);
				}
			});

			user.memberships = newMemberships;
			db.users.update(user, function (body) {
				res.send(204);
			},
			function (err) {
				handleError(err, res);
			});
		});
	});

	app.post("/data/:circleId/user", ensureAdminCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		var user = req.body;

		db.users.findByEmail(user.email, function (err, userAccount) {
			if (err) {
				return handleError(err, res);
			}

			var accountFound = function (account) {
				user.memberships.forEach(function (newMembership) {
					account.memberships.push(newMembership);
				});

				db.users.update(account, 
					function (body) {
						res.send(201);
					},
					function (err) {
						handleError(err, res);
					}
				);
			};

			if (userAccount) {
				accountFound(userAccount);
			}
			else {
				var isReadOnly = false;
				var memberships = [];
				db.users.add(
					user.name,
					user.email, 
					user.password,
					[], // no memberships at first
					user.isReadOnly,
					function (user) {
						accountFound(user);
					}, 
					function (err) {
						handleError(err, res);
					});
			}
		});
	});

	app.get("/data/:circleId/users/names", ensureCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		db.users.findNamesByCircleId(circleId, function (err, names) {
			if (err) {
				return handleError(err, res);
			}

			var ignoreCase = function (a, b) {
				a = a.toLowerCase();
				b = b.toLowerCase();
				if (a < b) {
					return -1;
				}
				if (a > b) {
					return 1;
				}
				return 0;
			};

			names = names.sort(ignoreCase);
			res.send(200, names);
		});
	});

	// Init routes
	app.put("/data/initialize", initRoutes.init);

	// Settings!
	app.get("/data/settings", function (req, res) { // public
		var onSuccess = function (settings) {
			res.send(200, settings);
		};

		onFailure = function (err) {
			handleError(err, res);
		};

		db.settings.get(onSuccess, onFailure);
	});

	app.get("/data/settings/private", ensureMainframeAccess, function (req, res) {
		var onSuccess = function (settings) {
			res.send(200, settings);
		};

		onFailure = function (err) {
			handleError(err, res);
		};

		db.settings.getPrivate(onSuccess, onFailure);
	});

	app.get("/data/settings/authorized", ensureMainframeAccess, function (req, res) {
		var onSuccess = function (settings) {
			res.send(200, settings);
		};

		onFailure = function (err) {
			handleError(err, res);
		};

		db.settings.getAuthorized(onSuccess, onFailure);
	});

	app.put("/data/setting", ensureMainframeAccess, function (req, res) {
		var data = req.body;
		db.settings.save(data, 
			function (setting) {
				if (setting.name === 'ssl-key-path' || setting.name === 'ssl-cert-path') {
					// TODO: Tell the client if we started the server?
					tryToCreateHttpsServer();
				}
				res.send(200);
			},
			function (err) {
				handleError(err, res);
			}
		);
	});

	// Circles!
	app.get("/data/circles", ensureMainframeAccess, function (req, res) {
		db.circles.getAll(function (err, circles) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, circles);
		})
	});

	app.post("/data/circle", ensureMainframeAccess, function (req, res) {
		var circle = req.body.circle;
		var admin = req.body.admin;

		if (!admin.email) {
			return res.send(400, "An email address for an administrative user is required when making a circle.");
		}

		db.circles.add(circle, function (err, newCircle) {
			if (err) {
				return handleError(err, res);
			}

			var administrativeGroup = {
				name: "Administrative",
				projectId: newCircle._id,
				isPermanent: true
			};

			var impliedGroup = {
				name: "_implied",
				projectId: newCircle._id,
				isPermanent: true
			};

			var nextMeeting = {};	
			nextMeeting.projectId = newCircle._id;
			nextMeeting.summary = "Next meeting";
			nextMeeting.isNextMeeting = true;

			db.stories.add(nextMeeting, function (err, body) {
				if (err) {
					return handleError(err, res);;
				}

				db.groups.add(administrativeGroup, function (adminGroup) {
					db.groups.add(impliedGroup, function (memberGroup) {
						db.users.findByEmail(admin.email, function (err, adminAccount) {
							if (err) {
								return handleError(err, res);
							}

							var accountFound = function (account) {
								// admin access
								account.memberships.push({
									circle: newCircle._id,
									group: adminGroup.id,
									level: "member"
								});
								// member access
								account.memberships.push({
									circle: newCircle._id,
									group: memberGroup.id,
									level: "member"
								});

								db.users.update(account, 
									function (body) {
										res.send(200, newCircle);
									},
									function (err) {
										handleError(err, res);
									}
								);
							};

							if (adminAccount) {
								accountFound(adminAccount);
							}
							else {
								var isReadOnly = false;
								var memberships = [];
								db.users.add("Admin",
									admin.email, 
									"public", // TODO: Change 
									memberships,
									isReadOnly,
									function (user) {
										accountFound(user);
									}, 
									function (err) {
										handleError(err, res);
									});
							}
						});
					},
					function (err) {
						// failure adding member group
						return handleError(err, res);
					});
				},
				function (err) {
					// failure adding admin group
					return handleError(err, res);
				});
			});
		});
	});

	app.put("/data/circle", ensureMainframeAccess, function (req, res) {
		var circle = req.body;
		db.circles.update(circle, function (err, updateCircle) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, updateCircle);
		});
	});


	// Groups!
	app.get("/data/:circleId/groups", ensureCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		db.groups.findByProjectId(circleId, function (err, groups) {
			if (err) {
				return handleError(err, res);
			}
			
			res.send(200, groups);
		});
	});

	var addGroup = function (group, res) {
		db.groups.add(group, 
			function (group) {
				res.send(200, group);
			},
			function (err) {
				handleError(err, res);
			}
		);
	};

	// TODO: Ensure circle access
	app.post("/data/group", ensureAdministrator, function (req, res) {
		var data = req.body;

		var group = {};	
		group.projectId = data.projectId;
		group.name = data.name;

		addGroup(group, res);
	});

	// TODO: Ensure circle access
	app.get("/data/group/:groupId", ensureAuthenticated, function (req, res) {
		var groupId = req.params.groupId;
		db.groups.findById(groupId, function (err, group) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, group);
		});
	});

	// TODO: Ensure circle access
	app.put("/data/group/remove", ensureAdministrator, function (req, res) {
		var group = req.body;

		db.groups.remove(group, 
			function () {
				res.send(200);
			},
			function (err) {
				handleError(err, res);
			}
		);
	});


	// Story routes
	app.get("/data/:circleId/stories", ensureCircleAccess, function (req, res) {
		var circleId = req.params.circleId;

		db.stories.findByProjectId(circleId, function (err, stories) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, stories);
		});
	});

	// TODO: combine this with /stories to return one object with 
	// both the story list and the first story (in two different things)
	app.get("/data/:circleId/first-story", ensureCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		db.stories.getFirstByProjectId(circleId, function (err, firstStory) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, firstStory);
		});
	});

	app.get("/data/:circleId/archives", ensureCircleAccess, function (req, res) {
		var circleId = req.params.circleId;
		db.archives.findByCircleId(circleId, function (err, archives) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, archives);
		});
	});


	var getNewNotificationMessage = function (story, req) {
		var message = "Hi. You've been requested to look at a new story on Circle Blvd.\n\n";
		if (story.summary) {
			message += "Summary: " + story.summary + "\n\n";
		}
		if (story.description) {
			message += "Description: " + story.description + "\n\n";	
		}

		var protocol = "http";
		if (httpsServer) {
			protocol = "https";
		}
		message += "View on Circle Blvd:\n" + 
			protocol + "://" + req.get('Host') + "/#/stories/" + story.id;
		
		return message;
	};

	// params: story, sender, recipients, message, subjectPrefix
	var sendStoryNotification = function (params, callback) {
		var story = params.story;
		var sender = params.sender;
		var recipients = params.recipients;
		var message = params.message;
		var subjectPrefix = params.subjectPrefix;

		db.settings.getAll(function (settings) {
			var smtpService = settings['smtp-service'];
			var smtpUsername = settings['smtp-login'];
			var smtpPassword = settings['smtp-password'];

			if (!smtpUsername || !smtpPassword || !smtpService) {
				return callback({
					status: 501,
					message: "The server needs SMTP login info before sending notifications. Check the admin page."
				})
			}

			smtpService = smtpService.value;
			smtpUsername = smtpUsername.value;
			smtpPassword = smtpPassword.value;

			var smtp = mailer.createTransport("SMTP", {
				service: smtpService,
				auth: {
					user: smtpUsername,
					pass: smtpPassword
				}
			});

			var toList = function () {
				var result = "";
				recipients.forEach(function (addressee) {
					result += addressee.name + " <" + addressee.email + ">,"
				});
				result = result.slice(0,-1); // remove last comma
				return result;
			}(); // closure;

			var opt = {
				from: sender.name + " via Circle Blvd <" + smtpUsername + ">",
				to: toList,
				replyTo: sender.name + " <" + sender.email + ">",
				subject: subjectPrefix + story.summary,
				text: message
			};

			// For testing:
			// console.log(opt);
			// callback(null, {ok: true});

			smtp.sendMail(opt, function (err, response) {
				smtp.close();
				if (err) {
					callback(err);
				}
				else {
					callback(null, response);
				}
			});
		});
	};

	var getCommentNotificationMessage = function (comment, story, req) {
		var message = comment.createdBy.name + " writes: ";
		message += comment.text;

		// TODO: Refactor duplicate code
		var protocol = "http";
		if (httpsServer) {
			protocol = "https";
		}
		message += "\n\nView on Circle Blvd:\n" + 
			protocol + "://" + req.get('Host') + "/#/stories/" + story.id;
		
		return message;
	};


	var getNotificationRecipients = function (accounts) {
		var recipients = [];

		accounts.forEach(function (account) {
			var recipient = {
				name: account.name,
				email: account.email
			};

			// Use notification email addresses
			if (account.notifications && account.notifications.email) {
				recipient.email = account.notifications.email;
			}
			recipients.push(recipient);
		});

		return recipients;
	};

	var sendCommentNotification = function (params, req) {
		if (!params || !params.comment || !params.story || !params.user) {
			console.log("Bad call to send-comment notification. Doing nothing.");
			return;
		}

		var comment = params.comment;
		var story = params.story;
		var sender = params.user;
		if (sender.notifications && sender.notifications.email) {
			// Use notification email addresses
			sender.email = sender.notifications.email;
		}

		var participants = {};
		if (story.createdBy) {
			participants[story.createdBy.id] = {
				name: story.createdBy.name
			};
		}

		if (story.comments) {
			story.comments.forEach(function (comment) {
				if (comment.createdBy) {
					participants[comment.createdBy.id] = {
						name: comment.createdBy.name
					};
				}
			});
		}


		db.users.findByName(story.owner, function (err, owner) {
			if (story.owner && err) {
				// Log, but we can continue.
				console.log("Comment notification: Cannot find story owner for story: " + story.id);
				console.log(err);
			}
			if (owner) {
				participants[owner._id] = {
					name: owner.name
				};
			}

			// Assert: We have all the participants now
			var recipientAccountIds = [];
			for (var accountId in participants) {
				// Remove the sender from the 'to' list
				if (accountId !== sender._id) {
					recipientAccountIds.push(accountId);
				}
			}

			if (recipientAccountIds.length === 0) {
				// We're done!
				return;
			}

			db.users.findMany(recipientAccountIds, function (err, accounts) {
				var sendParams = {
					story: story,
					sender: sender,
					message: getCommentNotificationMessage(comment, story, req),
					recipients: getNotificationRecipients(accounts),
					subjectPrefix: "new comment: "
				};

				sendStoryNotification(sendParams, function (err, response) {
					if (err) {
						console.log(err);
						return;
					}
					// Do nothing.
				});
			});
		});
	};

	var copyStory = function (story) {
		var copy = {};
		
		copy.projectId = story.projectId;
		copy.summary = story.summary;
		copy.isDeadline = story.isDeadline;
		copy.isNextMeeting = story.isNextMeeting;

		copy.createdBy = story.createdBy;
		copy.nextId = story.nextId;

		return copy;
	};

	var addStory = function (story, res) {
		var storyFor2ndTry = copyStory(story);
		db.stories.add(story, function (err, addedStory) {
			if (err) {
				return handleError(err, res);
			}

			res.send(200, addedStory);
		});
	};

	var getCreatedBy = function (req) {
		var createdBy = undefined;
		if (req.user) {
			createdBy = {
				name: req.user.name,
				id: req.user._id
			};
		}

		return createdBy;
	};

	// TODO: Ensure that the circleId specified in this
	// story is valid. Otherwise people can hack around
	// ways of accessing stories.
	//
	// This might be a thing to do at the data layer, or
	// we could do it higher up by getting the story
	// from the database and comparing the projectId to
	// the one specified, which might be a cleaner approach.
	app.post("/data/story/", ensureAuthenticated, function (req, res) {
		var data = req.body;
		ensureIsCircle(data.projectId, req, res, function() {
			var story = copyStory(data);
			story.createdBy = getCreatedBy(req);

			addStory(story, res);			
		});
	});

	app.put("/data/story/", ensureAuthenticated, function (req, res) {
		var story = req.body;
		var commentText = undefined;
		ensureIsCircle(story.projectId, req, res, function () {
			// TODO: This is an opportunity to clean up the API?
			// In other words, add /data/story/comment? Maybe.
			if (story.newComment) {
				var comment = {
					text: story.newComment,
					createdBy: getCreatedBy(req),
					timestamp: Date.now()
				};

				story.newComment = comment;
			}

			db.stories.save(story, 
				function (savedStory) {
					if (story.newComment) {
						var params = {
							story: savedStory,
							comment: story.newComment,
							user: req.user
						};
						sendCommentNotification(params, req);	
					}
					res.send(200, savedStory);
				},
				function (err) {
					handleError(err, res);
				}
			);
		});	
	});

	// TODO: Refactor out the circle access
	app.get("/data/story/:storyId", ensureAuthenticated, function (req, res) {
		var storyId = req.params.storyId;
		if (!storyId) {
			return res.send(400, "Story id required.");
		}

		db.docs.get(storyId, function (err, doc) {
			if (err) {
				return handleError(err, res);
			}

			if (!doc || doc.type !== "story") {
				return res.send(400, "Story not found");
			}

			var circleId = doc.projectId;
			var memberships = req.user.memberships;
			var hasAccess = false;
			memberships.forEach(function (membership) {
				if (membership.circle === circleId) {
					hasAccess = true;
				}
			});

			if (hasAccess) {
				// TODO: This is the plain db story document.
				// Is that ok? Or do we want to process it first?
				res.send(200, doc);
			}
			else {
				res.send(403, "Not a member of this circle");
			}
		});
	});

	app.put("/data/story/move", ensureAuthenticated, function (req, res) {
		var body = req.body;
		var story = body.story;
		var newNextId = body.newNextId;
		ensureIsCircle(story.projectId, req, res, function () {
			db.stories.move(story, newNextId, function (response) {
				res.send(200, response);
			},
			function (err) {
				handleError(err, res);
			});
		});
	});

	var removeStory = function (story, res) {
		db.stories.remove(story, 
			function () {
				res.send(200);
			},
			function (err) {
				handleError(err, res);
			}
		);
	};

	app.put("/data/story/archive", ensureAuthenticated, function (req, res) {
		var story = req.body;
		ensureIsCircle(story.projectId, req, res, function () {
			var stories = [];
			stories.push(story);

			db.archives.addStories(stories, 
			function (body) {
				// TODO: If this breaks then we have a data
				// integrity issue, because we have an archive
				// of a story that has not been deleted.
				removeStory(story, res);
			}, 
			function (err) {
				handleError(err, res);
			});
		});
	});

	app.put("/data/story/remove", ensureAuthenticated, function (req, res) {
		var story = req.body;
		ensureIsCircle(story.projectId, req, res, function () {
			removeStory(story, res);
		});
	});


	app.post("/data/story/notify/new", ensureAuthenticated, function (req, res) {
		var story = req.body;
		var sender = req.user;
		ensureIsCircle(story.projectId, req, res, function () {
			if (story.isOwnerNotified) {
				return res.send(412, "Story owner has already been notified.");
			}

			db.users.findByCircleAndName(story.projectId, story.owner, function (err, owner) {
				if (err) {
					return handleError(err, res);
				}

				// Use notification email addresses
				if (sender.notifications && sender.notifications.email) {
					sender.email = sender.notifications.email;
				}
				if (owner.notifications && owner.notifications.email) {
					owner.email = owner.notifications.email;
				}

				var params = {
					story: story,
					sender: sender,
					recipients: [owner],
					message: getNewNotificationMessage(story, req),
					subjectPrefix: "new story: "
				};

				sendStoryNotification(params, function (err, response) {
					if (err) {
						return handleError(err, res);
					}

					var onSuccess = function (savedStory) {
						res.send(200, response);
					};

					var onError = function (err) {
						handleError(err, res);
					};

					db.stories.markOwnerNotified(story, onSuccess, onError);
				});
			});
		});
	});

	// TODO: Where should this be on the client?
	app.put("/data/:circleId/settings/show-next-meeting", ensureAdminCircleAccess, function (req, res) {
		var showNextMeeting = req.body.showNextMeeting;
		var projectId = req.params.circleId;

		var handleNextMeeting = function (err, nextMeeting) {
			if (err) {
				handleError(err, res);
			}
			else {
				if (showNextMeeting) {
					// TODO: Should probably be in the data access layer.
					// TODO: Consider passing in the summary from the client,
					// as 'meeting' should be a configurable word.
					var story = {};
					story.summary = "Next meeting";
					story.isNextMeeting = true;

					addStory(story, res);
				}
				else {
					removeStory(nextMeeting, res);
				}
			}
		};

		var nextMeeting = db.stories.getNextMeetingByProjectId(projectId, handleNextMeeting);
	});

	// The secret to bridging Angular and Express in a 
	// way that allows us to pass any path to the client.
	// 
	// Also, this depends on the static middleware being
	// near the top of the stack.
	app.get('*', function (req, res) {
		// Redirect to 'initialize' on first-time use.
		//
		// Use a cookie to control flow and prevent redirect loops.
		// Maybe not the best idea; feel free to have a better one.
		var usersExist = function(callback) {
			db.users.count(function (err, count) {
				if (err) {
					callback(err);
				}
				else if (count > 0) {
					callback(null, true);
				}
				else {
					callback(null, false);
				}
			});
		};

		usersExist(function (err, exist) {
			if (err) {
				return handleError(err, res);
			}
			
			if (!exist && !req.cookies.initializing) {
				res.cookie('initializing', 'yep');
				res.redirect('/#/initialize');
			}
			else {
				res.clearCookie('initializing');
				routes.index(req, res);			
			}
		});
	});

	http.createServer(app).listen(app.get('port'), function () {
		console.log("Express http server listening on port " + app.get('port'));
	});
		
	// Run an https server if we can.
	tryToCreateHttpsServer(function (err, success) {
		if (err) {
			console.log(err);
		}
		else {
			console.log(success);
		}
	});
};

var forceHttps = function(req, res, next) {
	if (!httpsServer) {
		// Don't do anything if we can't do anything.
		return next();
	}

	if(req.secure 
		|| req.headers['x-forwarded-proto'] === 'https' 
		|| req.host === "localhost") {
		return next();	
	}
	res.redirect('https://' + req.get('Host') + req.url);
};

var initSettings = function (callback) {
	// Visibility definitions:
	//   public: visible to all
	//   private: visible to administrators
	//   secret: visible to the database and computer memory
	var defaultSettings = [{
		name: "demo",
		value: false,
		visibility: "public"
	},{
		name: 'session-secret',
		value: uuid.v4(),
		visibility: "secret"
	},{
		name: "smtp-login",
		value: null,
		visibility: "private"
	},{
		name: "smtp-password",
		value: null,
		visibility: "secret"
	},{
		name: "smtp-service",
		value: "Zoho",
		visibility: "private"
	},{ 
		name: "ssl-ca-path",
		value: null,
		visibility: "private"
	},{
		name: "ssl-cert-path",
		value: null,
		visibility: "private"
	},{
		name: "ssl-key-path",
		value: null,
		visibility: "private"
	}];

	var settingsTable = {};
	var initialized = {};
	defaultSettings.forEach(function (setting) {
		settingsTable[setting.name] = setting;
		initialized[setting.name] = undefined;
	});

	var callbackIfAllSettingsReady = function () {
		var isReady = true;
		for (var key in initialized) {
			if (initialized[key] === undefined) {
				isReady = false;
				break;
			}
		}

		if (isReady && callback) {
			callback(null, initialized);
		}
	};

	db.settings.getAll(function (savedSettings) {
		// var savedSetting;
		// var defaultSetting;
		var settingFound;
		var settingReady = function (setting) {
			initialized[setting.name] = setting;
			callbackIfAllSettingsReady();
		};

		for (var defaultName in settingsTable) {
			
			settingFound = false;
			for (var savedName in savedSettings) {
				if (savedName === defaultName) {
					settingFound = true;
					break;
				}
			}

			if (!settingFound) {
				var addSettingToDatabase = function (settingToAdd) {
					db.settings.add(settingToAdd, 
						function (body) {
							settingReady(settingToAdd);
						},
						function (err) {
							callback({
								message: "Could not set setting: " + settingToAdd.name
							});
						}
					);
				}(settingsTable[defaultName]);				
			}
			else {
				settingReady(savedSettings[savedName]);
			}
		}
	});
};

// configure Express
app.configure(function() {
	// TODO: Put port in config
	app.set('port', process.env.PORT || 3000);
	app.set('ssl-port', process.env.SSL_PORT || 4000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(forceHttps);
	app.use(express.compress());
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.logger('dev'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	var initSettingsOk = function (settings) {
		var sessionSecret = settings['session-secret'].value;

		app.use(express.session({ secret: sessionSecret }));
		initAuthentication();
		app.use(app.router);
		configureSuccessful();
	};

	var tenSeconds = 10000;
	db.whenReady(function () {
		initSettings(function (err, settings) {
			if (err) {
				console.log(err);
			}
			else {
				initSettingsOk(settings);
			}
		});
	}, tenSeconds);

	// TODO: Do we need to wait a little bit to ensure the
	// servers are started before our thread exits?
});