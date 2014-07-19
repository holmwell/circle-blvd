var express  = require('express');
var http     = require('http');
var request  = require('request');
var path     = require('path');
var async    = require('async');
var routes   = require('./routes');

var auth   = require('./lib/auth.js');
var ensure = require('./lib/auth-ensure.js');
var limits = require('./lib/limits.js');
var errors = require('./lib/errors.js');
var db     = require('./lib/dataAccess.js').instance();
var notify = require('./lib/notify.js');

var sslServer = require('./lib/https-server.js');
var payment   = require('./lib/payment.js')();
var settings  = require('./lib/settings.js');

var usersRoutes = require('./routes/users');
var userRoutes 	= require('./routes/user');
var initRoutes 	= require('./routes/init');

var couchSessionStore = require('./lib/couch-session-store.js');
var app = express();

// Middleware for data access
var guard = errors.guard;

var handle = function (res) {
	var fn = guard(res, function (data) {
		res.send(200, data);
	}); 
	return fn;
};

var send = function (fn) {
	var middleware = function (req, res, next) {
		fn(handle(res));
	};

	return middleware;
};

var data = function (fn) {
	// A generic guard for callbacks. Call the
	// fn parameter. If there is an error, pass
	// it up to the error handler. Otherwise
	// append the result to the request object,
	// for the next middleware in line.
	var middleware = function (req, res, next) {
		fn(guard(res, function (data) {
			if (req.data) {
				// TODO: programmer error
			}
			req.data = data;
			next();
		}));
	};

	return middleware;
};

// Authentication. 
var initAuthentication = function () {
	auth.usernameField('email');
	auth.passwordField('password');
	app.use(auth.initialize());
	// Use passport.session() middleware to support
	// persistent login sessions.
	app.use(auth.session());
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

		db.users.recordSigninSuccess(dbUser, function (err, savedUser) {
			if (err) {
				errors.log(err);
			}
			res.send(200, publicUser);
		});
	};

	var failure = function (error, user) {
		errors.log(error);
		var code = error.code || 401;
		var message = "Unauthorized";
		if (code === 429) {
			message = "Too many attempts";
		}

		if (error.user) {
			db.users.recordSigninFailure(error.user, function (err, savedUser) {
				if (err) {
					errors.log(err);
				}
				res.send(code, message);
			});
		}
		else {
			res.send(code, message);			
		}
	};

	var middleware = auth.local(req, success, failure);
	middleware(req, res, next);
};

var tryToCreateHttpsServer = function (callback) {
	sslServer.create(app, callback);
};

var configureSuccessful = function () {
	app.post('/auth/signin', authenticateLocal);

	app.get('/auth/signout', function (req, res) {
		req.logout();
		res.send(204); // no content
	});

	// Data API: Protected by authorization system	
	// User routes (account actions. requires login access)
	app.get("/data/user", ensure.auth, userRoutes.user);

	app.put("/data/user/name", ensure.auth, userRoutes.updateName);
	app.put("/data/user/email", ensure.auth, userRoutes.updateEmail);
	app.put("/data/user/notificationEmail", ensure.auth, userRoutes.updateNotificationEmail)

	app.put("/data/user/password", ensure.auth, userRoutes.updatePassword);

	// User routes (circle actions. requires admin access)
	app.get("/data/:circleId/members", ensure.circleAdmin, function (req, res) {
		var circleId = req.params.circleId;
		db.users.findByCircleId(circleId, handle(res));
	});

	app.put("/data/:circleId/member/remove", ensure.circleAdmin, function (req, res) {
		// usersRoutes.remove
		var circleId = req.params.circleId;
		var reqUser = req.body;

		db.users.findById(reqUser.id, guard(res, function (user) {
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
				errors.handle(err, res);
			});
		}));
	});

	app.post("/data/:circleId/member", ensure.circleAdmin, function (req, res) {
		var circleId = req.params.circleId;
		var member = req.body;

		// TODO: Get the memberships from the server side.
		// The client should only need to specify user data
		// and the group names.
		var addMembershipsToAccount = function (account) {
			member.memberships.forEach(function (newMembership) {
				// Basic data validation
				if (newMembership.circle === circleId) {
					var m = {};
					m.circle = newMembership.circle;
					m.group = newMembership.group;
					m.level = newMembership.level;
					account.memberships.push(m);
				}
			});

			db.users.update(account, 
				function (body) {
					res.send(201);
				},
				function (err) {
					errors.handle(err, res);
				}
			);
		};

		db.users.findByEmail(member.email, guard(res, function (userAccount) {
			if (userAccount) {
				addMembershipsToAccount(userAccount);
			}
			else {
				var isReadOnly = false;
				var memberships = [];
				db.users.add(
					member.name,
					member.email, 
					member.password,
					[], // no memberships at first
					member.isReadOnly,
					function (user) {
						addMembershipsToAccount(user);
					}, 
					function (err) {
						errors.handle(err, res);
					});
			}
		}));
	});

	app.get("/data/:circleId/members/names", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		db.users.findNamesByCircleId(circleId, guard(res, function (names) {
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
		}));
	});

	// Init routes
	app.put("/data/initialize", initRoutes.init);

	// Settings!
	app.get("/data/settings", function (req, res) { // public
		db.settings.get(guard(res, function (settings) {
			db.settings.getAuthorized(function (err, privateSettings) {
				if (err) {
					// Ignore
					return res.send(200, settings);
				}
				// Computed settings.
				var smtpEnabledSetting = {
					type: "setting",
					name: "smtp-enabled",
					visibility: "public"
				};

				if (privateSettings['smtp-login'] 
					&& privateSettings['smtp-login'].value) {
					smtpEnabledSetting.value = true;
				}
				else {
					smtpEnabledSetting.value = false;
				}

				settings['smtp-enabled'] = smtpEnabledSetting;
				res.send(200, settings);
			});
		}));
	});

	// TODO: This is not used. Assess.
	app.get("/data/settings/private", 
		ensure.mainframe, send(db.settings.getPrivate)); 

	app.get("/data/settings/authorized", 
		ensure.mainframe, send(db.settings.getAuthorized));

	app.put("/data/setting", ensure.mainframe, function (req, res) {
		var data = req.body;
		db.settings.update(data, guard(res, function (setting) {
			if (setting.name === 'ssl-key-path' || setting.name === 'ssl-cert-path') {
				// TODO: Tell the client if we started the server?
				tryToCreateHttpsServer();
			}
			if (setting.name === 'stripe-secret-key') {
				payment.setApiKey(setting.value);
			}
			res.send(200);
		}));
	});

	// Circles!
	app.get("/data/circles", ensure.auth, function (req, res) {
		db.circles.findByUser(req.user, handle(res));
	});

	app.get("/data/circles/all", 
		ensure.mainframe, 
		send(db.circles.getAll));

	app.post("/data/circle", 
		ensure.auth, limits.circle, limits.users.circle, function (req, res) {
		//
		var circleName = req.body.name;
		var user = req.user;

		if (!circleName) {
			var message = "A 'name' property is required, for naming the circle.";
			return res.send(400, message);
		}

		db.circles.create(circleName, user.email, handle(res));
	});

	app.post("/data/circle/admin", ensure.mainframe, function (req, res) {
		var circle = req.body.circle;
		var admin = req.body.admin;

		if (!admin.email) {
			var message = "An email address for an administrative user " +
				"is required when making a circle.";
			return res.send(400, message);
		}

		db.circles.create(circle.name, admin.email, handle(res));
	});

	app.put("/data/circle", ensure.mainframe, function (req, res) {
		var circle = req.body;
		db.circles.update(circle, handle(res));
	});


	// Groups!
	app.get("/data/:circleId/groups", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		db.groups.findByProjectId(circleId, handle(res));
	});

	// TODO: We'll turn groups on at a later time, as we
	// transition toward hosting larger groups, but in the 
	// mean time this is just a security hole.
	// 
	// var addGroup = function (group, res) {
	// 	db.groups.add(group, 
	// 		function (group) {
	// 			res.send(200, group);
	// 		},
	// 		function (err) {
	// 			errors.handle(err, res);
	// 		}
	// 	);
	// };

	// TODO: Ensure circle access
	// app.post("/data/group", ensureAdministrator, function (req, res) {
	// 	var data = req.body;

	// 	var group = {};	
	// 	group.projectId = data.projectId;
	// 	group.name = data.name;

	// 	addGroup(group, res);
	// });

	// // TODO: Ensure circle access
	app.get("/data/group/:groupId", ensure.auth, function (req, res) {
		var groupId = req.params.groupId;
		db.groups.findById(groupId, handle(res));
	});

	// // TODO: Ensure circle access
	// app.put("/data/group/remove", ensureAdministrator, function (req, res) {
	// 	var group = req.body;

	// 	db.groups.remove(group, 
	// 		function () {
	// 			res.send(200);
	// 		},
	// 		function (err) {
	// 			errors.handle(err, res);
	// 		}
	// 	);
	// });


	// Story routes
	app.get("/data/:circleId/stories", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		db.stories.findByProjectId(circleId, handle(res));
	});

	// TODO: combine this with /stories to return one object with 
	// both the story list and the first story (in two different things)
	app.get("/data/:circleId/first-story", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		db.stories.getFirstByProjectId(circleId, handle(res));
	});

	app.get("/data/:circleId/archives", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		var query = req.query;
		var defaultLimit = 251; // TODO: Settings

		var limit = query.limit || defaultLimit;
		var startkey = query.startkey;
		var params = {
			limit: limit,
			startkey: startkey
		};

		db.archives.findByCircleId(circleId, params, handle(res));
	});

	app.get("/data/:circleId/archives/count", ensure.circle, function (req, res) {
		var circleId = req.params.circleId;
		db.archives.countByCircleId(circleId, guard(res, function (count) {
			res.send(200, count.toString());
		}));
	});

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
		db.stories.add(story, handle(res));
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
	app.post("/data/story/", ensure.auth, function (req, res) {
		var data = req.body;
		ensure.isCircle(data.projectId, req, res, function() {
			var story = copyStory(data);
			story.createdBy = getCreatedBy(req);

			// Add the story if we're under the server limit.
			checkStoryLimit(function () {
				addStory(story, res);
			});

			function getCircle (callback) {
				db.docs.get(story.projectId, function (err, circle) {
					if (err) {
						return callback(err);
					}

					if (circle.type !== "circle") {
						return callback("Sorry, the projectId specified is not a circle.");
					}

					callback(null, circle);
				});
			}

			function checkStoryLimit(callback) {
				async.parallel([db.settings.getAll, getCircle], guard(res, function (results) {
					var settings = results[0];
					var circle = results[1];
					checkSettings(settings, circle, callback);
				}));
			}

			function checkSettings(settings, circle, callback) {
				if (!settings['limit-stories-per-circle'] || !circle.isAnonymous) {
					// No limit!
					return callback(); 
				}

				var limit = settings['limit-stories-per-circle'].value;
				db.stories.countByCircleId(story.projectId, guard(res, function (count) {
					if (count >= limit) {
						// TODO: Add validation-specific instructions, after 
						// we have an account validation mechanism.
						res.send(403, "Sorry, this circle has reached its story-creation limit," +
							" and no more can be made at the moment.");
						return;
					}
					return callback();
				}));
			}
		});
	});

	var getComment = function (text, req) {
		var comment = {
			text: text,
			createdBy: getCreatedBy(req),
			timestamp: Date.now()
		};

		return comment;
	};

	var saveStoryWithComment = function (story, req, res) {
		db.stories.save(story, 
			function (savedStory) {
				if (story.newComment) {
					var params = {
						story: savedStory,
						comment: story.newComment,
						user: req.user
					};
					notify.sendCommentNotification(params, req);	
				}
				res.send(200, savedStory);
			},
			function (err) {
				errors.handle(err, res);
			}
		);
	};

	app.put("/data/story/", ensure.auth, function (req, res) {
		var story = req.body;
		var commentText = undefined;
		ensure.isCircle(story.projectId, req, res, function () {
			// TODO: This is an opportunity to clean up the API?
			// In other words, add /data/story/comment? Maybe.
			if (story.newComment) {
				story.newComment = getComment(story.newComment, req);
			}
			saveStoryWithComment(story, req, res);
		});	
	});

	app.put("/data/story/comment", ensure.auth, function (req, res) {
		// circleId, storyId, comment
		var data = req.body;
		if (!data.circleId || !data.storyId || !data.comment) {
			return res.send(400, "Missing circleId, storyId or comment.");
		}

		ensure.isCircle(data.circleId, req, res, function () {
			db.docs.get(data.storyId, guard(res, function (story) {
				if (story.projectId !== data.circleId) {
					return res.send(400);
				}

				story.newComment = getComment(data.comment, req);
				saveStoryWithComment(story, req, res);
			}));
		});
	});

	// TODO: Refactor out the circle access
	app.get("/data/story/:storyId", ensure.auth, function (req, res) {
		var storyId = req.params.storyId;
		if (!storyId) {
			return res.send(400, "Story id required.");
		}

		db.docs.get(storyId, guard(res, function (doc) {
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
		}));
	});

	app.put("/data/story/fix", ensure.auth, function (req, res) {
		var body = req.body;
		var story = body.story;
		var newNextId = body.newNextId;
		ensure.isCircle(story.projectId, req, res, function () {
			story.nextId = newNextId;
			db.stories.fix(story, function (response) {
				res.send(200, response);
			},
			function (err) {
				errors.handle(err, res);
			});
		});
	});

	app.put("/data/story/move", ensure.auth, function (req, res) {
		var body = req.body;
		var story = body.story;
		var newNextId = body.newNextId;
		ensure.isCircle(story.projectId, req, res, function () {
			db.stories.move(story, newNextId, function (response) {
				res.send(200, response);
			},
			function (err) {
				errors.handle(err, res);
			});
		});
	});

	var removeStory = function (story, res) {
		db.stories.remove(story, 
			function () {
				res.send(200);
			},
			function (err) {
				errors.handle(err, res);
			}
		);
	};

	app.put("/data/story/archive", ensure.auth, function (req, res) {
		var story = req.body;
		ensure.isCircle(story.projectId, req, res, function () {
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
				errors.handle(err, res);
			});
		});
	});

	app.put("/data/story/remove", ensure.auth, function (req, res) {
		var story = req.body;
		ensure.isCircle(story.projectId, req, res, function () {
			removeStory(story, res);
		});
	});


	app.post("/data/story/notify/new", ensure.auth, function (req, res) {
		var story = req.body;
		var sender = req.user;
		ensure.isCircle(story.projectId, req, res, function () {
			if (story.isOwnerNotified) {
				return res.send(412, "Story owner has already been notified.");
			}

			db.users.findByCircleAndName(story.projectId, story.owner, guard(res, function (owner) {
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
					message: notify.getNewNotificationMessage(story, req),
					subjectPrefix: "new story: "
				};

				notify.sendStoryNotification(params, guard(res, function (response) {
					var onSuccess = function (savedStory) {
						res.send(200, response);
					};

					var onError = function (err) {
						errors.handle(err, res);
					};

					db.stories.markOwnerNotified(story, onSuccess, onError);
				}));
			}));
		});
	});

	// TODO: Where should this be on the client?
	app.put("/data/:circleId/settings/show-next-meeting", ensure.circleAdmin, function (req, res) {
		var showNextMeeting = req.body.showNextMeeting;
		var projectId = req.params.circleId;

		var handleNextMeeting = guard(res, function (nextMeeting) {
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
		});

		var nextMeeting = db.stories.getNextMeetingByProjectId(projectId, handleNextMeeting);
	});

	app.post('/payment/donate', function (req, res) {
		var data = req.body;
		var stripeTokenId = data.stripeTokenId;
		var amount = data.stripeAmount

		payment.donate(stripeTokenId, amount, handle(res));
	});

	app.post('/payment/subscribe', ensure.auth, function (req, res) {
		var data = req.body;

		var user = req.user;
		var stripeTokenId = data.stripeTokenId;
		var planName = data.planName;

		payment.subscribe(user, stripeTokenId, planName, handle(res));
	});

	app.put('/payment/subscribe/cancel', ensure.auth, function (req, res) {
		var user = req.user;
		if (!user.subscription) {
			return res.send(204);
		}

		payment.unsubscribe(user, handle(res));
	});

	app.post("/data/signup/now", limits.circle, function (req, res) {
		var data = req.body;

		var proposedAccount = {
			name: data.name,
			email: data.email,
			password: data.password
		};

		var proposedCircle = {
			name: data.circle
		};

		var userAccountCreated = function (newAccount) {
			db.circles.create(proposedCircle.name, newAccount.email, handle(res));
		};

		db.users.findByEmail(proposedAccount.email, guard(res, function (accountExists) {
			if (accountExists) {
				return res.send(400, "That email address is already being used. Maybe try signing in?")
			}

			var isReadOnly = false;

			db.users.add(
				proposedAccount.name,
				proposedAccount.email, 
				proposedAccount.password,
				[], // no memberships at first
				isReadOnly,
				userAccountCreated, 
				function (err) {
					errors.handle(err, res);
				});
		}));
	});

	app.post("/data/signup/waitlist", function (req, res) {
		var data = req.body;
		var request = {
			circle: data.circle,
			things: data.things,
			email: data.email
		};

		db.waitlist.add(request, handle(res));
	});

	app.get("/data/waitlist", ensure.mainframe, send(db.waitlist.get));

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

		usersExist(guard(res, function (exist) {
			if (!exist && !req.cookies.initializing) {
				res.cookie('initializing', 'yep');
				res.redirect('/#/initialize');
			}
			else {
				res.clearCookie('initializing');
				routes.index(req, res);			
			}
		}));
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
	if (!sslServer.isRunning()) {
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

var getCookieSettings = function () {
	// TODO: Check settings to guess if https is running.
	// Or actually figure out if https is running, and if so
	// use secure cookies
	var oneHour = 3600000;
	var twoWeeks = 14 * 24 * oneHour;
	var cookieSettings = {
		path: '/',
		httpOnly: true,
		secure: false,
		maxAge: twoWeeks
	};

	return cookieSettings;
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
		var SessionStore = couchSessionStore(express.session);
		var cookieSettings = getCookieSettings();
		app.use(express.session({ 
			store: new SessionStore(),
			secret: sessionSecret,
			cookie: cookieSettings
		}));

		var stripeApiKey = settings['stripe-secret-key'];
		if (stripeApiKey) {
			payment.setApiKey(stripeApiKey.value);
		}

		initAuthentication();
		app.use(app.router);
		app.use(function (err, req, res, next) {
			if (err) {
				return errors.handle(err, res);
			}
			// TODO: Should not get here.
		});
		configureSuccessful();
	};

	settings.init(function (err, settings) {
		if (err) {
			console.log(err);
		}
		else {
			initSettingsOk(settings);
		}
	});
});