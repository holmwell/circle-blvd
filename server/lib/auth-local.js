// auth-local.js
var auth   = require('./auth.js');
var db     = require('./dataAccess.js').instance();
var errors = require('./errors.js');

var authenticateLocal = function(req, res, next) {
	var success = function() {
		var dbUser = req.user;
		var publicUser = {};

		publicUser.id = dbUser.id;
		publicUser.email = dbUser.email;
		publicUser.name = dbUser.name;
		publicUser.memberships = dbUser.memberships;
		publicUser.notifications = dbUser.notifications;

		db.users.recordSigninSuccess(dbUser, function (err, savedUser) {
			if (err) {
				errors.log(err);
			}
			res.send(200, publicUser);
		});
	};

	var failure = function (error, user) {
		errors.log(error);
		var code = error.code || 401;
		var message = "Unauthorized";
		if (code === 429) {
			message = "Too many attempts";
		}

		if (error.user) {
			db.users.recordSigninFailure(error.user, function (err, savedUser) {
				if (err) {
					errors.log(err);
				}
				res.send(code, message);
			});
		}
		else {
			res.send(code, message);			
		}
	};

	var middleware = auth.local(req, success, failure);
	middleware(req, res, next);
};

var signout = function (req, res) {
	req.logout();
	res.send(204); // no content
};

var attach = function (app) {
	auth.usernameField('email');
	auth.passwordField('password');
	app.use(auth.initialize());
	// Use passport.session() middleware to support
	// persistent login sessions.
	app.use(auth.session());
};

module.exports = function () {
	return {
		attach: attach,
		signin: authenticateLocal,
		signout: signout
	};
}(); // closure
