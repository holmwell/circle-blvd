var CRYPTO_ALGORITHM = 'sha256';
var DIGEST_ENCODING = 'hex';

var crypto = require('crypto');
var uuid = require('node-uuid');
var nano = require('nano');

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

	var createViews = function() {
		// TODO: Add views to the database if they're
		// not present. This is a secondary priority,
		// as we can get by for now without this.
	};

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

	var createDatabaseAndViews = function() {
		// Create database!
		databaseExists(function (err, exists) {
			if (err) {
				throw (err);
			}
			else if (exists) {
				createViews();
			}
			else {
				createDatabase();
				createViews();
			}
		});
	};

	createDatabaseAndViews();
}();


var db = function() {
	// TODO: Use a database instead of objects in memory.
	var userList = {};
	var userEmailToId = {};
	var passwordList = {};

	var isValidUser = function(user) {
		return user && user.email && user.id;
	}

	var hashPassword = function(password, salt) {
		var hmac = crypto.createHmac(CRYPTO_ALGORITHM, salt);
		var hash = hmac.update(password).digest(DIGEST_ENCODING);
		return hash;
	}
	
	return {
		users: { 
			add: function(user, password, success, failure) {				
				if (!isValidUser(user)) {
					// TODO: Error?
					console.log(user);
					return failure("User cannot be null?");
				}

				if (this.findById(user.id)) {
					// TODO: Error codes, etc.
					return failure("User already exists.");
				}

				if (this.findByEmail(user.email)) {
					//TODO: Error?
					return failure("User email already exists");
				}

				userList[user.id] = user;
				userEmailToId[user.email] = user.id;

				var salt = uuid.v4();
				var hash = hashPassword(password, salt);
				passwordList[user.id] = { "hash":hash, "salt":salt };

				return success();
			},
			remove: function(user, success, failure) {
				if (!(user && user.email)) {
					// Do nothing. TODO: Do what?
				}
				else if (this.findById(user.id)) {
					// TODO: Test this.
					delete userList[user.id];
					delete userEmailToId[user.email];
					delete passwordList[user.id];
					return success();
				}

				// TODO: Error codes.
				return failure();
			},
			findByEmail: function(userEmail) {
				var id = userEmailToId[userEmail];
				return id ? this.findById(id) : null;
			},
			findById: function(id) {
				var user = userList[id];
				return user ? user : null;
			},
			update: function(user, success, failure) {
				if (isValidUser(user) && this.findById(user.id)) {
					userList[user.id] = user;
					userEmailToId[user.email] = user.id;
					return success();
				} 
				return failure();
			},
			updatePassword: function(user, password, success, failure) {
				if (!isValidUser(user) && !this.findById(user.id)) {
					return failure();
				}

				var salt = uuid.v4();
				var hash = hashPassword(password, salt);
				passwordList[user.id] = { "hash":hash, "salt":salt };

				return success();
			},
			validatePassword: function(user, password, success, failure) {
				if(!isValidUser(user) && !passwordList[user.id]) {
					return failure();
				}

				var salt = passwordList[user.id].salt;
				var hash = passwordList[user.id].hash;
				if(hashPassword(password, salt) == hash) {
					return success();
				}
				
				return failure();
			},
			getAll: function() {
				return userList;
			},
			count: function() {
				return Object.keys(userList).length;
			}
		}
	}; // end return
}();


exports.instance = function() {
	return db;
};
