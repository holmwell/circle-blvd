var express  = require('express');
var request  = require('request');
var path     = require('path');
var routes   = require('./routes')
var auth     = require('./lib/auth.js');
var db       = require('./lib/dataAccess.js').instance();

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

// Data API: First-time configuration
var createUser = function (name, email, password, res) {
	var onSuccess = function() {
		res.send(200);
	};

	var onError = function (err) {
		handleError(err, res);
	};

	db.users.add(name, email, password, onSuccess, onError);
};

app.put("/data/initialize", function (req, res) {
	var data = req.body;
	createUser("Admin", data.email, data.password, res);
});

// Data API: Protected by authorization system
app.get("/data/user", ensureAuthenticated, function (req, res) {
	res.send(req.user);
});

app.put("/data/user", ensureAuthenticated, function (req, res) {
	var data = req.body;

	if (req.user.id !== data.id) {
		var message = "It doesn't appear that you own the account you are trying to modify.";
		return res.send(412, message);
	}

	var onSuccess = function () {
		res.send(200);
	};
	var onError = function (err) {
		handleError(err, res);
	};

	db.users.update(data, onSuccess, onError);
});

app.put("/data/user/password", ensureAuthenticated, function (req, res) {
	var data = req.body;
	if (!data.password) {
		return res.send(400, "Missing password field.");
	}

	var onSuccess = function () {
		res.send(200);
	};
	var onError = function (err) {
		handleError(err, res);
	}

	db.users.updatePassword(req.user, data.password, onSuccess, onError);
});


app.get("/data/users", ensureAuthenticated, function (req, res) {
	db.users.getAll(function (err, users) {
		if (err) {
			return handleError(err, res);
		}
		res.send(users);
	});
});

app.put("/data/users/add", ensureAuthenticated, function (req, res) {
	var data = req.body;
	createUser(data.name, data.email, data.password, res);
});

app.put("/data/users/remove", ensureAuthenticated, function (req, res) {
	var data = req.body;

	var onSuccess = function() {
		res.send(204);
	};
	var onError = function(err) {
		handleError(err, res);
	};

	db.users.remove(data, onSuccess, onError); 
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