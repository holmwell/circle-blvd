var couch = require('./couch.js');
var encrypt = require('./encrypt.js');

var db = function() {

	var isValidUser = function(user) {
		return user && user.email && user.id;
	}
	
	return {
		users: { 
			add: function(user, password, success, failure) {

				var addUser = function (user, password) {
					couch.users.add(user, password, function (err, body) {
						if (err) {
							failure(err);
						}
						else {
							success();	
						}
					});
				};

				if (!isValidUser(user)) {
					// TODO: Error?
					console.log(user);
					return failure("User cannot be null?");
				}

				var that = this;
				this.findById(user.id, function (err, body) {
					if (body) {
						// TODO: Error codes, etc.
						failure("User already exists.");
					}
					else {
						that.findByEmail(user.email, function (err, body) {
							if (body) {
								//TODO: Error?
								failure("User email already exists");
							}
							else {
								addUser(user, password);
							}
						});
					}
				});
			},
			// remove: function(user, success, failure) {
			// 	if (!(user && user.email)) {
			// 		// Do nothing. TODO: Do what?
			// 	}
			// 	else if (this.findById(user.id)) {
			// 		// TODO: DO THIS ...
			// 		return success();
			// 	}

			// 	// TODO: Error codes.
			// 	return failure();
			// },
			findByEmail: function(userEmail, callback) {
				couch.users.findByEmail(userEmail, callback);
			},
			findById: function(id, callback) {
				couch.users.findById(id, callback);
			},
			update: function(user, success, failure) {
				if (!isValidUser(user)) {
					return failure();
				}

				this.findById(user.id, function (err, user) {
					if (err) {
						return failure(err);
					}
					couch.users.update(user, function (err) {
						if (err) {
							return failure(err);
						}
						success();
					});
				});
			},
			// updatePassword: function(user, password, success, failure) {
			// 	if (!isValidUser(user) && !this.findById(user.id)) {
			// 		return failure();
			// 	}

			// 	// TODO ...
			// 	// db.users.findById(user.id, function (err, user) {
			// 	// 	if (err || !user) {
			// 	// 		return failure();
			// 	// 	}

			// 	// 	db.passwords.findById(user.id, function (pass) {

			// 	// 	});
			// 	// });

			// 	// var salt = uuid.v4();
			// 	// var hash = hashPassword(password, salt);
			// 	// passwordList[user.id] = { "hash":hash, "salt":salt };

			// 	return success();
			// },
			validatePassword: function(user, password, success, failure) {
				if(!isValidUser(user)) {
					return failure();
				}

				couch.passwords.findById(user.id, function (err, pass) {
					if (err || !pass) {
						return failure();
					}

					var salt = pass.salt;
					var hash = pass.hash;	
					if(encrypt.hash(password, salt) === hash) {
						return success();
					}
					return failure();
				});
			},
			getAll: function(callback) {
				couch.users.getAll(callback);
			},
			count: function(callback) {
				couch.users.getAll(function (err, users) {
					if (err) {
						callback(err);
					}
					else {
						callback(null, users.length);
					}
				});
			}
		}
	}; // end return
}();


exports.instance = function() {
	return db;
};
