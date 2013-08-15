var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('./dataAccess.js').instance();

// defaults
var usernameField = 'username';
var passwordField = 'password';

// callback = fn(error, user);
var findUserById = function(id, callback) {
	db.users.findById(id, function (err, user) {
		if (user) {
			return callback(null, user);
		} 
		// TODO: Use error codes
		callback(new Error('User ' + id + ' does not exist'));
	});
};

// callback = fn(error, user);
var verify = function(email, password, callback) {
	db.users.findByEmail(email, function (err, user) {
		if (err) {
			return callback(err);
		}
		if(!user) {
			// TODO: Use error codes
			// TODO: Really, we should just return "unauthorized"
			// to the client, so as to not give any hints to whether
			// an attacker is making progress.
			return callback(new Error('Unknown user ' + email));
		}

		var success = function () {
			callback(null, user);
		}

		var failure = function() {
			// TODO: Use error codes
			callback(new Error("Invalid password"));		
		}

		db.users.validatePassword(user, password, success, failure);	
	});
};


exports.initialize = function() {
	// Passport session setup.
	//   To support persistent login sessions, Passport needs to be able to
	//   serialize users into and deserialize users out of the session.  Typically,
	//   this will be as simple as storing the user ID when serializing, and finding
	//   the user by ID when deserializing.
	passport.serializeUser(function(user, callback) {
		callback(null, user.id);
	});

	passport.deserializeUser(function(id, callback) {
		findUserById(id, function (err, user) {
			callback(err, user);
		});
	});

	// Use the LocalStrategy within Passport.
	//   Strategies in passport require a `verify` function, which accept
	//   credentials (in this case, a username and password), and invoke a callback
	//   with a user object.  In the real world, this would query a database;
	//   however, in this example we are using a baked-in set of users.
	var formManifest = {
		// Names of the properties of our User object
		usernameField: usernameField,
		passwordField: passwordField
	};
	var asyncVerify = function (username, password, callback) {
		process.nextTick(function() {
			verify(username, password, function (err, user) {
				if (err) { 
					callback(err); 
				} else {
					callback(null, user);
				}
			});
		});
	};

	var strategy = new LocalStrategy(formManifest, asyncVerify);
	passport.use(strategy);
	return passport.initialize();
};


// Returns authentication middleware that calls 'success' on
// a successful login and 'failure' otherwise.
exports.local = function(req, success, failure) {
	// The actual verification is done via the 'verify' 
	// function, above.
	return passport.authenticate('local', function (err, user, info) {
		if (err) { 
			return failure(err);
		}
		if (!user) { 
			return failure("Invalid login data");
		}
		// req.login is added by the passport.initialize() middleware
		// to manage login state. We need to call it directly, as we're
		// overriding the default passport behavior.
		req.login(user, function(err) {
			if (err) { 
				return failure(err);
			}
			success();
		});
	});
};

exports.usernameField = function(val) {
	if (val) {
		usernameField = val;
	}
	return usernameField;
}

exports.passwordField = function(val) {
	if (val) {
		passwordField = val;
	}
	return passwordField;
}

exports.session = function() {
	return passport.session();
};