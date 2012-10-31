var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var db = require('./dataAccess.js').instance();

var findById = function(id, fn) {
	var user = db.users.findById(id);
	if (user) {
		fn(null, user);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}

var getUser = function(email, password, fn) {
	var user = db.users.findByEmail(email);
	if(!user) {
		fn(new Error('Unknown user ' + username));
		return;
	}

	db.users.validatePassword(user, password, function() {
		fn(null, user);
	},
	function() {
		fn(new Error("Invalid password"));
	});
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	findById(id, function (err, user) {
		done(err, user);
	});
});


// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
	function(email, password, done) {
		// asynchronous verification, for effect...
		process.nextTick(function () {
			getUser(email, password, function(err, user) {
				if (err) { 
					done(err); 
				} else {
					done(null, user);
				}
			});

		});
	}));

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
exports.ensure = function(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	// TODO: Do what now?
	res.redirect('/')
}

exports.authenticate = function(callback) {
	return passport.authenticate('local', callback);
};


exports.initialize = function() {
	return passport.initialize();
};
exports.session = function() {
	return passport.session();
};

