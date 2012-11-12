var express  = require('express');
var request  = require('request');
var auth = require('./lib/auth.js');
var db = require('./lib/dataAccess.js').instance();

var app = express();
var localfile = express.static(__dirname + '/app');

// Configure auth 
auth.usernameField('email');
auth.passwordField('password');

// configure Express
app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.logger());
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({ secret: 'what? ok!' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
	app.use(auth.initialize());
	app.use(auth.session());
	app.use(app.router);
	app.use(localfile);
});


// TODO: Read if we can add something like this to specify which
// paths are protected behind the auth wall. 
//
// app.all('*', requireAuthentication)
// app.all('*', loadUser);

var usersExist = function() {
	return db.users.count() > 0;
};


// Redirect to 'initialize' on first-time use.
app.get("/", function(req, res) {
	if (!usersExist()) {
		res.redirect('/client/#/initialize');
	}
	else {
		res.redirect('/client/');
	}
});

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

app.listen(8080);

