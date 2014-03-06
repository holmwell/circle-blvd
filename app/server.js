var express  = require('express');
var request  = require('request');
var path     = require('path');
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
app.del("/data/users/remove", ensureAuthenticated, usersRoutes.remove);

// User routes
app.get("/data/user", ensureAuthenticated, userRoutes.user);
app.put("/data/user", ensureAuthenticated, userRoutes.update);
app.put("/data/user/password", ensureAuthenticated, userRoutes.updatePassword);

// Init routes
app.put("/data/initialize", initRoutes.init);

// Story routes
var nextStoryId = undefined;
var getNewStoryId = function() {
	// TODO: Should move to the server, obvi,
	// but works for now.
	if (!nextStoryId) {
		nextStoryId = 1;
	}
	else {
		nextStoryId++;
	}
	return nextStoryId;
};

app.get("/data/stories/newId", function (req, res) {
	// TODO: "/data/stories/:projectId/create" instead?
	res.send(200, "" + getNewStoryId());
});

var tmpStories = [];
for (var i=0; i < 10; i++) {
	tmpStories[i] = {
		id: getNewStoryId(),
		summary: "Story"
	}
}

app.get("/data/stories/:projectId", function (req, res) {
	var projectId = req.params.projectId;
	console.log(projectId);
	res.send(200, tmpStories);
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