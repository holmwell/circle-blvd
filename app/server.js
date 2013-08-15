var express  = require('express');
var request  = require('request');
var path     = require('path');
var routes   = require('./routes')
var auth = require('./lib/auth.js');
var db = require('./lib/dataAccess.js').instance();

var app = express();

// Configure auth 
auth.usernameField('email');
auth.passwordField('password');

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
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
	app.use(auth.initialize());
	app.use(auth.session());
	app.use(app.router);
});

var logError = function (err) {
	console.log(err);
};

var handleError = function (err, res) {
	logError(err);
	res.send(500);
};

// TODO: Read if we can add something like this to specify which
// paths are protected behind the auth wall. 
//
// app.all('*', requireAuthentication)
// app.all('*', loadUser);

// Authentication. This defines what we send
// back to clients that want to authenticate
// with the system.
var authMiddleware = function(req, res, next) {

	var success = function() {
		res.send(200, "Login successul");
	};

	var failure = function(error) {
		logError(error);
		res.send(401, "Unauthorized"); 
	};

	// The auth library provides middleware that
	// calls 'success' or 'failure' in the appropriate
	// login situation.
	var middleware = auth.authenticate(req, success, failure);
	middleware(req, res, next);
};

app.post('/login', authMiddleware);


var createUser = function (name, email, password, res) {
	var createUserById = function (userId) {
		var user = {
			name: name,
			email: email,
			id: userId
		};

		var onSuccess = function() {
			res.send(200);
		};
		var onError = function (err) {
			handleError(err, res);
		};

		db.users.add(user, password, onSuccess, onError);
	};

	db.users.count(function (err, count) {
		if (err) {
			return handleError(err, res);
		}
		createUserById(count + 1);	
	});
};

// Data API: First-time configuration
app.put("/data/initialize", function (req, res) {
	var data = req.body;
	createUser("Admin", data.email, data.password, res);
});

// Data API: Protected by authorization system
app.get("/data/user", auth.ensure, function (req, res) {
	res.send(req.user);
});

app.get("/data/users", auth.ensure, function (req, res) {
	db.users.getAll(function (err, users) {
		if (err) {
			return handleError(err, res);
		}
		res.send(users);
	});
});

app.put("/data/users/add", auth.ensure, function (req, res) {
	var data = req.body;
	createUser(data.name, data.email, data.password, res);
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

