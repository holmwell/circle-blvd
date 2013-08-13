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
		console.log(error);
		res.send(401, "Unauthorized"); 
	};

	// The auth library provides middleware that
	// calls 'success' or 'failure' in the appropriate
	// login situation.
	var middleware = auth.authenticate(req, success, failure);
	middleware(req, res, next);
};

app.post('/login', authMiddleware);


// Data API: First-time configuration
app.put("/data/initialize", function(req, res) {
	var data = req.body;

	var user = {
		name: "Admin",
		email: data.email,
		id: db.users.count() + 1
	};
	var password = data.password;

	db.users.add(
		user,
		password,
		function() {
			// Success.
			// TODO: ...
			res.send("Ok!");
		},
		function(error) {
			// Fail.
			res.send(500, error);
		}
	);
});

// Data API: Protected by authorization system
app.get("/data/user", auth.ensure, function(req, res) {
	res.send(req.user);
});

app.get("/data/users", auth.ensure, function(req, res) {
	res.send(db.users.getAll());
});

app.put("/data/users/add", auth.ensure, function(req, res) {
	// TODO: This is the exact same thing as what's in
	// initialize, above, so refactor it.
	var data = req.body;

	var user = {
		name: data.name,
		email: data.email,
		id: db.users.count() + 1
	};
	var password = data.password;

	db.users.add(
		user,
		password,
		function() {
			// Success.
			// TODO: ...
			res.send("Ok!");
		},
		function(error) {
			// Fail.
			res.send(500, error);
		}
	);
});


var usersExist = function() {
	return db.users.count() > 0;
};

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
	if (!usersExist() && !req.cookies.initializing) {
		res.cookie('initializing', 'yep');
		res.redirect('/#/initialize');
	}
	else {
		res.clearCookie('initializing');
		routes.index(req, res);
	}
});

app.listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
	console.log("Ready.");
});

