var express  = require('express');
var http     = require('http');
var https    = require('https');
var fs       = require('fs');
var request  = require('request');
var path     = require('path');
var uuid     = require('node-uuid');
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
		
		if (sslKeyPath && sslCertPath) {
			var options = {
				key: fs.readFileSync(sslKeyPath),
				cert: fs.readFileSync(sslCertPath)
			};

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
			// TODO: And if we err?
			res.send(200, stories);
		});
	});

	// TODO: combine this with /stories to return one object with 
	// both the story list and the first story (in two different things)
	app.get("/data/:projectId/first-story", ensureAuthenticated, function (req, res) {
		var projectId = req.params.projectId;
		db.stories.getFirstByProjectId(projectId, function (err, firstStory) {
			res.send(200, firstStory);
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

	app.post("/data/story/", ensureAuthenticated, function (req, res) {
		var data = req.body;

		var story = {};	
		story.projectId = data.projectId;
		story.summary = data.summary;
		story.isDeadline = data.isDeadline;
		story.isNextMeeting = data.isNextMeeting;

		if (req.user) {
			story.createdBy = {
				name: req.user.name,
				id: req.user._id
			};
		}

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

		db.stories.save(story, 
			function () {
				res.send(200);
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
		console.log("Moving ...");

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

	app.put("/data/story/remove", ensureAuthenticated, function (req, res) {
		var story = req.body;
		removeStory(story, res);
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

var setSessionSecret = function (callback) {
	db.settings.getAll(
		function (settings) {
			var sessionSecret = settings['session-secret'];

			if (!sessionSecret) {
				var secretSetting = {};
				secretSetting.name = 'session-secret';
				secretSetting.value = uuid.v4();
				secretSetting.visibility = "secret";

				db.settings.add(secretSetting, 
					function (body) {
						callback(null, secretSetting);
					}, 
					function (err) {
						callback({
							message: "Failed to start. Could not set session secret." 
						});
					}
				);
			}
			else {
				callback(null, sessionSecret);
			}
		},
		function (err) {
			callback({
				message: "Failed to start. Could not get settings."
			})
		}
	);
};


// configure Express
app.configure(function() {
	// TODO: Put port in config
	app.set('port', process.env.PORT || 3000);
	app.set('ssl-port', process.env.SSL_PORT || 4000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.logger('dev'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	var sessionSecretOk = function (setting) {
		app.use(express.session({ secret: setting.value }));
		initAuthentication();
		app.use(app.router);
		configureSuccessful();
	};

	var tenSeconds = 10000;
	db.whenReady(function () {
		setSessionSecret(function (err, setting) {
			if (err) {
				console.log(err);
			}
			else {
				sessionSecretOk(setting);
			}
		});
	}, tenSeconds);
});
