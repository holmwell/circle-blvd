var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('./dataAccess.js').instance();

// defaults
var usernameField = 'username';
var passwordField = 'password';

var getUserWithFriendlyGroups = function (user, callback) {
	db.groups.findByUser(user, function (err, groups) {
		if (err) {
			return callback(err);
		}
		db.circles.findByUser(user, function (err, circles) {
			if (err) {
				return callback(err);
			}

			// Populate the user's membership data with the
			// names of the memberships.
			for (var membershipKey in user.memberships) {
				var membership = user.memberships[membershipKey];
				for (var groupKey in groups) {
					var group = groups[groupKey];
					if (group && membership.group === group._id) {
						// TODO: Might just want to throw all the group
						// data in there.
						user.memberships[membershipKey].name = groups[groupKey].name;
					}
				}

				for (var circleKey in circles) {
					var circle = circles[circleKey];
					if (circle && membership.circle === circle._id) {
						user.memberships[membershipKey].circleName = circles[circleKey].name;
						// TODO: ... really?
						user.memberships[membershipKey].circleColors = circles[circleKey].colors;
						user.memberships[membershipKey].circleIsArchived = circles[circleKey].isArchived;
					}
				}
			};

			return callback(null, user);
		});
	});
};

// callback = fn(error, user);
var findUserById = function(id, callback) {
	db.users.findById(id, function (err, user) {
		if (user) {
			getUserWithFriendlyGroups(user, callback);
		} 
		else {
			// TODO: Use error codes
			callback(new Error('User ' + id + ' does not exist'));	
		}
	});
};

exports.findUserById = findUserById;

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

		var updateUser = false;
		if (user.auth 
			&& user.auth.signinFailures
			&& user.auth.signinFailures.length > 0) {

			// Reset attempts if it has been more than
			// one day since the last failure.
			var now = Date.now();
			var lastFailure = user.auth.signinFailures.pop();
			var oneDay = 1000 * 60 * 60 * 24;
			if (now - lastFailure > oneDay) {
				user.auth.signinFailures = [];
				updateUser = true;
			}

			var tooManyFailures = 25;
			if(user.auth.signinFailures.length >= tooManyFailures) {
				var error = {
					code: 429,
					status: "Too many failed attempts."
				}
				return callback(error);
			}
		}

		var success = function () {
			getUserWithFriendlyGroups(user, callback);
		}

		var failure = function() {
			// TODO: Use error codes
			var error = {
				code: 401,
				status: "Invalid password",
				user: user
			};

			callback(error);
		}

		var callValidatePassword = function callValidatePassword(user) {
			db.users.validatePassword(user, password, success, failure);
		};

		if (updateUser) {
			db.users.update(user, function onSuccess (savedUser) {
				callValidatePassword(savedUser);
			},
			function onError(err) {
				// We don't really care about this in the moment,
				// as it should be self-correcting in the future,
				// or the database is down and the next call will
				// fail anyway.
				console.log(err);
				callValidatePassword(user);
			});
		}
		else {
			callValidatePassword(user);
		}
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

// Authenticate a user directly. Used for forgotten passwords.
exports.forceSignin = function (user, req, callback) {
	req.login(user, callback);
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