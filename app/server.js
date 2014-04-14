var express  = require('express');
var request  = require('request');
var path     = require('path');
var routes   = require('./routes')
var auth     = require('./lib/auth.js');
var db       = require('./lib/dataAccess.js').instance();
var uuid 	 = require('node-uuid');

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

// configure Express
app.configure(function() {
	// TODO: Put port in config
	app.set('port', 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.logger('dev'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'what? ok!' }));
	initAuthentication();	
	app.use(app.router);
});

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

var authenticateLocal = function(req, res, next) {
	var success = function() {
		var dbUser = req.user;
		var publicUser = {};

		publicUser.id = dbUser.id;
		publicUser.email = dbUser.email;
		publicUser.name = dbUser.name;

		res.send(200, publicUser);
	};

	var failure = function(error) {
		logError(error);
		res.send(401, "Unauthorized"); 
	};

	var middleware = auth.local(req, success, failure);
	middleware(req, res, next);
};

// TODO: Require https (for passwords)
app.post('/auth/signin', authenticateLocal);

app.get('/auth/signout', function (req, res) {
	req.logout();
	res.send(204); // no content
});


// Data API: Protected by authorization system

// Users routes
app.get("/data/users", ensureAuthenticated, usersRoutes.list);
app.post("/data/users/add", ensureAuthenticated, usersRoutes.add);
// TODO: Does this even work?
app.del("/data/users/remove", ensureAuthenticated, usersRoutes.remove);

// User routes
app.get("/data/user", ensureAuthenticated, userRoutes.user);
app.put("/data/user", ensureAuthenticated, userRoutes.update);
app.put("/data/user/password", ensureAuthenticated, userRoutes.updatePassword);

// Init routes
app.put("/data/initialize", initRoutes.init);

// Story routes
app.get("/data/uuid", function (req, res) {
	var id = uuid.v4();
	res.send(200, id);
});

app.get("/data/:projectId/new-story-id", function (req, res) {
	var projectId = req.params.projectId;

	db.stories.findByProjectId(projectId, function (err, stories) {
		var newStoryId = "1";

		for (var key in stories) {
			var story = stories[key];
			var newStoryIdNumber = +newStoryId;
			if (+story.id > newStoryIdNumber) {
				newStoryId = story.id;
			}
		};

		// TODO: Save new-story-ids in an array or something? 
		// Or maybe this is just for testing?
		newStoryId = "" + (+newStoryId + 1);
		res.send(200, newStoryId);
	});
});


app.get("/data/:projectId/stories", function (req, res) {
	var projectId = req.params.projectId;

	db.stories.findByProjectId(projectId, function (err, stories) {
		// TODO: And if we err?
		res.send(200, stories);
	});
});

// TODO: combine this with /stories to return one object with 
// both the story list and the first story (in two different things)
app.get("/data/:projectId/first-story", function (req, res) {
	var projectId = req.params.projectId;

	// TODO: Could make a view to get the first story for a project.
	db.stories.findByProjectId(projectId, function (err, stories) {
		var firstStory = undefined;
		for (var key in stories) {
			var story = stories[key];
			// save the first story
			if (story.isFirstStory) {
				firstStory = story;
				break;
			}
		};

		res.send(200, firstStory);
	});
});

app.post("/data/story/", function (req, res) {
	var data = req.body;

	var story = {};	
	story.projectId = data.projectId;
	story.summary = data.summary;

	// TODO: Really, we don't need both of these.
	//
	// Either we specify what the 'next story' is
	// or that the new story is going to be the
	// first story, but both distinctions are
	// unnecessary.
	story.nextId = data.nextId;
	// The dataAccess layer takes care of this.
	// story.isFirstStory = true; // data.isFirstStory;

	db.stories.add(story, 
		function (story) {
			res.send(200, story);
		},
		function (err) {
			console.log(err);
			res.send(500);
		}
	);
});

app.put("/data/story/", function (req, res) {
	var story = req.body;
	// TODO: Deprecate
	res.send(200);
	// db.stories.update(story, 
	// 	function () {
	// 		res.send(200);
	// 	},
	// 	function (err) {
	// 		console.log(err);
	// 		res.send(500);
	// 	}
	// );
});

app.put("/data/story/move", function (req, res) {
	var body = req.body;
	var story = body.story;
	var newNextId = body.newNextId;
	console.log("Moving ...");

	db.stories.move(story, newNextId, function (response) {
		res.send(200, response);
	},
	function (err) {
		console.log(err);
		res.send(500);
	});
});

app.put("/data/story/remove", function (req, res) {
	var story = req.body;
	db.stories.remove(story, 
		function () {
			res.send(200);
		},
		function (err) {
			console.log(err);
			res.send(500);
		}
	);
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

app.listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
	console.log("Ready.");
});