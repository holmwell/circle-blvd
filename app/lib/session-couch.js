var nano = require('nano');
// var views = require('./session-views.js');

module.exports = function (session) {
	var databaseUrl = 'http://localhost:5984';
	var databaseName = 'circle-blvd-sessions';

	// Connect to Couch! 
	var database, nanoMaster;
	var databaseOptions = {};
	databaseOptions.url = databaseUrl;
	var nanoMaster = nano(databaseOptions);
	var database = nanoMaster.use(databaseName);
	var isDatabaseReady = false;

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
				// views.create(database, callback);
			}
			else {
				createDatabase(function (err) {
					if (err) {
						console.log(err);
						callback(err);
					}
					else {
						// views.create(database, callback);
					}
				});
			}
		});
	};

	// TODO: Note, this causes the database to be
	// created immediately, which we might not want
	// to necessarily do.
	createDatabaseAndViews(function (err) {
		if (err) {
			console.log(err);
		}
		else {
			// database ready.
			isDatabaseReady = true;
		}
	});

	var whenDatabaseReady = function (callback, timeout) {
		var timeSpent = 0;
		var intervalId = setInterval(function () {
			if (isDatabaseReady) {
				clearInterval(intervalId);
				callback();
			}

			if (timeout && timeSpent > timeout) {
				clearInterval(intervalId);
				callback("Reached timeout before database was ready.")
			}

			timeSpent += 100;
		}, 100);
	};

	var getSessionDoc = function (sid, callback) {
		database.get(sid, function (err, doc) {
			if (err && err.error === 'not_found') {
				return callback();
			}
			callback(err, doc);
		});
	};

	var getSession = function (sid, callback) {
		getSessionDoc(sid, function (err, doc) {
			if (err) {
				return callback(err);
			}
			if (!doc) {
				return callback();
			}
			return callback(null, doc.session);
		});
	};

	var setSession = function (sid, sess, callback) {
		
		var saveSession = function (sessionDoc, callback) {
			database.insert(sessionDoc, function (err, body) {
				if (err && err.error === 'conflict') {
					// We're in conflict. Well, give up,
					// because we'll probably just cause
					// some race condition if we try again
					// at this point.
					// console.log("IGNORING CONFLICT");
					// console.log(sess.passport);
					return callback();
				}
				
				return callback(err);
			});
		};

		var areSessionsEqual = function (sess1, sess2) {
			if (sess1 === sess2) {
				return true;
			}

			// TODO: Refactor out this equality stuff, so we
			// don't have to know about the session serialization
			// process
			if (sess1.passport && sess2.passport) {
				return sess1.passport.user === sess2.passport.user;
			}

			return false;	
		};

		getSessionDoc(sid, function (err, docInStore) {
			if (err) {
				return callback(err);
			}

			var doc;
			if (docInStore) {
				if (areSessionsEqual(docInStore.session, sess)) {
					// do nothing
					return callback();
				}
				doc = {
					_id: sid,
					_rev: docInStore._rev,
					session: sess
				};
			}
			else {
				doc = {
					_id: sid,
					session: sess
				};
			}
			saveSession(doc, callback);
		});
	};

	var destroySession = function (sid, callback) {
		getSessionDoc(sid, function (err, doc) {
			if (err) {
				return callback(err);
			}
			if (!doc) {
				return callback();
			}

			database.destroy(doc._id, doc._rev, callback);
		});
	};

	// var clearAllSessions = function (callback) {

	// 	if (callback) {
	// 		callback();
	// 	}
	// };

	// var sessionCount = function (callback) {

	// };

	var Store = session.Store;

	function CouchStore (options) {
		var self = this;
		options = options || {};

		Store.call(this, options);
	}
	CouchStore.prototype.__proto__ = Store.prototype;
	CouchStore.prototype.get = getSession;
	CouchStore.prototype.set = setSession;
	CouchStore.prototype.destroy = destroySession;

	return CouchStore;
};