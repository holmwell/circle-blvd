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
	logError(err);
	res.send(500);
};

// Authentication. 
var ensureAuthenticated = function (req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.send(401, "Please authenticate with the server and try again.");
};

var ensureAdministrator = function (req, res, next) {
	var nope = function () {
		res.send(403, "User is not in the Administrative group.")
	}

	var isAdministrator = function () {
		if (req.user.memberships) {
			var groups = req.user.memberships;
			for (var groupKey in groups) {
				if (groups[groupKey].name === "Administrative") {
					return next();
				}
			}
		}

		return nope();
	};

	ensureAuthenticated(req, res, isAdministrator);
};

var authenticateLocal = function(req, res, next) {
	var success = function() {
		var dbUser = req.user;
		var publicUser = {};

		publicUser.id = dbUser.id;
		publicUser.email = dbUser.email;
		publicUser.name = dbUser.name;
		publicUser.memberships = dbUser.memberships;

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
	app.get("/data/users", ensureAdministrator, usersRoutes.list);
	app.post("/data/user", ensureAdministrator, usersRoutes.add);
	app.put("/data/user/remove", ensureAdministrator, usersRoutes.remove);

	// User routes (account actions. requires login access)
	app.get("/data/user", ensureAuthenticated, userRoutes.user);
	app.put("/data/user", ensureAuthenticated, userRoutes.update);
	app.put("/data/user/password", ensureAuthenticated, userRoutes.updatePassword);

	// TODO: This gets all the user's names on the server. We need
	// to associate users with projects.
	app.get("/data/x/users/names", ensureAuthenticated, function (req, res) {
		db.users.getAll(function (err, users) {
			if (err) {
				return handleError(err, res);
			}

			var user;
			var names = [];
			for (var index in users) {
				user = users[index];
				if (user.name) {
					names.push(user.name);
				}
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

	app.get("/data/settings/private", ensureAdministrator, function (req, res) {
		var onSuccess = function (settings) {
			res.send(200, settings);
		};

		onFailure = function (err) {
			handleError(err, res);
		};

		db.settings.getPrivate(onSuccess, onFailure);
	});

	app.get("/data/settings/authorized", ensureAdministrator, function (req, res) {
		var onSuccess = function (settings) {
			res.send(200, settings);
		};

		onFailure = function (err) {
			handleError(err, res);
		};

		db.settings.getAuthorized(onSuccess, onFailure);
	});

	app.put("/data/setting", ensureAdministrator, function (req, res) {
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

	// Groups!
	app.get("/data/:projectId/groups", ensureAuthenticated, function (req, res) {
		var projectId = req.params.projectId;

		db.groups.findByProjectId(projectId, function (err, groups) {
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

	app.post("/data/group", ensureAdministrator, function (req, res) {
		var data = req.body;

		var group = {};	
		group.projectId = data.projectId;
		group.name = data.name;

		addGroup(group, res);
	});

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
	app.get("/data/:projectId/stories", ensureAuthenticated, function (req, res) {
		var projectId = req.params.projectId;

		db.stories.findByProjectId(projectId, function (err, stories) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, stories);
		});
	});

	// TODO: combine this with /stories to return one object with 
	// both the story list and the first story (in two different things)
	app.get("/data/:projectId/first-story", ensureAuthenticated, function (req, res) {
		var projectId = req.params.projectId;
		db.stories.getFirstByProjectId(projectId, function (err, firstStory) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, firstStory);
		});
	});

	app.get("/data/:projectId/archives", ensureAuthenticated, function (req, res) {
		var projectId = req.params.projectId;
		db.archives.findByProjectId(projectId, function (err, archives) {
			if (err) {
				return handleError(err, res);
			}
			res.send(200, archives);
		});
	});

	var addStory = function (story, res) {
		db.stories.add(story, 
			function (story) {
				res.send(200, story);
			},
			function (err) {
				handleError(err, res);
			}
		);
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

	app.post("/data/story/", ensureAuthenticated, function (req, res) {
		var data = req.body;

		var story = {};	
		story.projectId = data.projectId;
		story.summary = data.summary;
		story.isDeadline = data.isDeadline;
		story.isNextMeeting = data.isNextMeeting;

		story.createdBy = getCreatedBy(req);

		// TODO: Really, we don't need both of these.
		//
		// Either we specify what the 'next story' is
		// or that the new story is going to be the
		// first story, but both distinctions are
		// unnecessary.
		story.nextId = data.nextId;
		// The dataAccess layer takes care of this.
		// story.isFirstStory = true; // data.isFirstStory;

		addStory(story, res);
	});

	app.put("/data/story/", ensureAuthenticated, function (req, res) {
		var story = req.body;
		var commentText = undefined;

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
				res.send(200, savedStory);
			},
			function (err) {
				handleError(err, res);
			}
		);
	});

	app.put("/data/story/move", ensureAuthenticated, function (req, res) {
		var body = req.body;
		var story = body.story;
		var newNextId = body.newNextId;

		db.stories.move(story, newNextId, function (response) {
			res.send(200, response);
		},
		function (err) {
			handleError(err, res);
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

	app.put("/data/story/remove", ensureAuthenticated, function (req, res) {
		var story = req.body;
		removeStory(story, res);
	});

	app.post("/data/story/notify/new", ensureAuthenticated, function (req, res) {
		var story = req.body;

		if (story.isOwnerNotified) {
			return res.send(412, "Story owner has already been notified.");
		}

		db.settings.getAll(function (settings) {
			var smtpService = settings['smtp-service'];
			var smtpUsername = settings['smtp-login'];
			var smtpPassword = settings['smtp-password'];

			if (!smtpUsername || !smtpPassword || !smtpService) {
				return res.send(501, "The server needs SMTP login info before sending notifications. Check the admin page.");
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

			var sender = req.user;
			db.users.findByName(story.owner, function (err, owner) {
				if (err) {
					return handleError(err, res);
				}

				var getMessage = function (story) {
					var message = "Hi. You've been requested to look at a new story on Circle Blvd.\n\n";
					if (story.summary) {
						message += "Summary: " + story.summary + "\n\n";
					}
					if (story.description) {
						message += "Description: " + story.description + "\n\n";	
					}

					message += "View on Circle Blvd:\nhttps://" + req.get('Host') + "/#/stories/" + story.id;
					
					return message;
				};

				// TODO: Use notification email addresses
				var opt = {
					from: sender.name + " via Circle Blvd <" + smtpUsername + ">",
					to: owner.name + " <" + owner.email + ">",
					replyTo: sender.name + " <" + sender.email + ">",
					subject: "new story: " + story.summary,
					text: getMessage(story)
				};

				// For testing:
				// console.log(opt.text);
				// res.send(200);

				smtp.sendMail(opt, function (err, response) {
					smtp.close();
					if (err) {
						handleError(err, res);
					}
					else {
						var onSuccess = function (savedStory) {
							res.send(200, response);
						};

						db.stories.markOwnerNotified(story, onSuccess, function (err) {
							handleError(err, res);
						});
					}
				});
			});
		});
	});


	app.put("/data/:projectId/settings/show-next-meeting", ensureAuthenticated, function (req, res) {
		var showNextMeeting = req.body.showNextMeeting;
		var projectId = req.params.projectId;

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
		initialized[setting.name] = false;
	});

	var callbackIfAllSettingsReady = function () {
		var isReady = true;
		for (var key in initialized) {
			if (!initialized[key]) {
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
				db.settings.add(settingsTable[defaultName], 
					function (body) {
						settingReady(settingsTable[defaultName]);
					},
					function (err) {
						callback({
							message: "Could not set setting: " + defaultName
						});
					}
				);
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
