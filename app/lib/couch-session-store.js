var designDocs = require('./design-docs-session.js');
var LocalDatabase = require('./data/couch/local-database.js');

module.exports = function (session) {
	var databaseName = process.env.DATABASE_NAME || 'circle-blvd';
	databaseName += '-sessions';
	
	var database = LocalDatabase(databaseName, designDocs);

	var lastMainenanceDate = undefined;
	var actuallyPerformMaintenance = function () {
		lastMainenanceDate = new Date();

		var deleteExpiredSessions = function () {
			var earliestDate = "";
			var endkey = new Date().toISOString();

			var options = {
				startkey: earliestDate,
				endkey: endkey
			};

			database.view("sessions", "byExpires", options, function (err, body) {
				if (err) {
					return console.log(err);
				}

				var bulkDoc = {};
				var options = {};
				bulkDoc.docs = [];

				body.rows.forEach (function (doc) {
					var deleteDoc = {
						_id: doc.id,
						_rev: doc.value,
						_deleted: true
					};
					bulkDoc.docs.push(deleteDoc);
				});

				database.bulk(bulkDoc, options, function (err, body) {
					if (err) {
						console.log(err);
					}
				});
			});
		};

		var performAllMaintenance = function () {
			deleteExpiredSessions();
			database.compact();
		};

		process.nextTick(performAllMaintenance);
	};

	// Dates are equal if they share the same day of the year.
	// We don't care about units smaller than days.
	var areDatesEqual = function (date1, date2) {
		if (date1.getYear() !== date2.getYear()
		|| date1.getMonth() !== date2.getMonth()
		|| date1.getDay() !== date2.getDay()) {
			return false;
		}

		return true;
	};

	var performMaintenance = function () {
		// actually perform maintenance if it hasn't
		// been done today, otherwise no.
		if (!lastMainenanceDate) {
			return actuallyPerformMaintenance();
		}
		if (areDatesEqual(new Date(), lastMainenanceDate)) {
			// do nothing
			return;
		}

		actuallyPerformMaintenance();
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
		performMaintenance();
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

			if (sess1.cookie && sess2.cookie) {
				if (sess1.cookie.expires !== sess2.cookie.expires) {
					var date1 = new Date(sess1.cookie.expires);
					var date2 = new Date(sess2.cookie.expires);

					if (!areDatesEqual(date1, date2)) {
						return false;
					}
				}
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