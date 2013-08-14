var nano = require('nano');
var views = require('./views.js');
var encrypt = require('./encrypt.js');

var couch = function() {

	var databaseUrl = 'http://localhost:5984';
	// TODO: Ideally, we want to make the database automatically
	// if 'burndown' doesn't already exist on first run, and if
	// it does then ask for a new database name. For now, we're
	// letting future selves figure that out.
	var databaseName = 'burndown';

	// Connect to Couch! 
	var database, nanoMaster;
	var databaseOptions = {};
	databaseOptions.url = databaseUrl;
	var nanoMaster = nano(databaseOptions);
	var database = nanoMaster.use(databaseName);

	var databaseExists = function (callback) {
		var opts = {
			db: databaseName,
			method: "GET"
		};

		nanoMaster.relax(opts, function (err, body) {
			if (err && err['status-code'] === 404) {
				callback(null, false);
			}
			else if (err) {
				callback(err);
			}
			else {
				callback(null, true);
			}
		});
	};

	var createDatabase = function (callback) {
		var opts = {
			db: databaseName,
			method: "PUT"
		};

		nanoMaster.relax(opts, callback);
	};

	var createDatabaseAndViews = function(callback) {
		// Create database!
		databaseExists(function (err, exists) {
			if (err) {
				throw (err);
			}
			else if (exists) {
				views.create(database, callback);
			}
			else {
				createDatabase(function (err) {
					if (err) {
						console.log(err);
						callback(err);
					}
					else {
						views.create(database, callback);		
					}
				});
			}
		});
	};

	// getView(viewUrl, [options], callback)
	var getView = function(viewUrl, viewGenerationOptions, callback) {
		var splitViewUrl = viewUrl.split('/');
		var designName = splitViewUrl[0];
		var viewName = splitViewUrl[1];

		if (typeof viewGenerationOptions === "function") {
			callback = viewGenerationOptions;
			viewGenerationOptions = {};
		}

		database.view(designName, viewName, viewGenerationOptions, function (err, body, headers) {
			if (err) {
				callback(err);
				return;
			}
			
			var docs = [];
			body.rows.forEach(function (doc) {
				docs.push(doc.value);
			});

			callback(null, docs);
		});
	};

	var findOneByKey = function(viewName, key, callback) {
		var options = {
			limit: 1,
			key: key
		};
		getView(viewName, options, function (err, rows) {
			var doc = null;
			if (err) {
				// TODO: ??
				console.log(err);
			}
			else if (rows && rows.length > 0) {
				doc = rows[0];
			}
			callback(doc);
		});		
	}

	var findUserByEmail = function(email, callback) {
		findOneByKey("users/byEmail", email, callback);
	};

	var findUserById = function(id, callback) {
		findOneByKey("users/byId", id, callback);
	};

	var findPasswordById = function (id, callback) {
		findOneByKey("passwords/byId", id, callback);
	};

	var addUser = function(user, password, callback) {
		user.type = "user";
		database.insert(user, function (err) {
			if (err) {
				return callback(err);
			}
			var salt = encrypt.salt();
			var hash = encrypt.hash(password, salt);
			var pass = {
				"userId": user.id,
				"hash":hash, 
				"salt":salt,
				"type": "password"
			}
			database.insert(pass, callback);
		});
	};

	var updateUser = function(user, callback) {
		// TODO: ... document conflicts, etc.
		database.insert(user, callback);
	};

	var getAllUsers = function(callback) {
		getView("users/byId", function (err, rows) {
			callback(err, rows);
		});
	};

	createDatabaseAndViews(function (err) {
		if (err) {
			console.log(err);
		}
		else {
			// database ready.	
		}
	});

	return {
		users: {
			add: addUser,
			findByEmail: findUserByEmail,
			findById: findUserById,
			getAll: getAllUsers,
			update: updateUser
		},
		passwords: {
			findById: findPasswordById
		}
	}
}();


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

				couch.passwords.findById(user.id, function (pass) {
					if (!pass) {
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
