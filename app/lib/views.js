// views.js
//
// The design docs and views specific to Burndown.
// Assumes "database" is an instance of a nano db.

// createViews(nano database, callback)
var createViews = function(database, callback) {
	var designDocs = [];

	var maybeReady = function (designDoc) {
		var areAllDocsReady = true;

		designDoc.isReady = true;
		designDocs.forEach(function (doc) {
			if (!doc.isReady) {
				areAllDocsReady = false;
			}
		});

		if (areAllDocsReady) {
			callback();
		}
	};


	var usersDesignDoc = {
		url: '_design/users',
		body: 
		{
			version: "1.0.0",
			language: "javascript",
			views: {
				byEmail: {
					map: function(doc) {
						if (doc.type === "user" && doc.email) {
							emit(doc.email, doc);
						}
					}
				},
				byId: {
					map: function (doc) {
						if (doc.type === "user" && doc.id) {
							emit(doc.id, doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(usersDesignDoc);

	var passwordsDesignDoc = {
		url: '_design/passwords',
		body: 
		{
			version: "1.0.0",
			language: "javascript",
			views: {
				byId: {
					map: function (doc) {
						if (doc.type === "password" && doc.userId) {
							emit(doc.userId, doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(passwordsDesignDoc);


	var saveDesignDocs = function () {
		var saveDoc = function (doc) {
			database.insert(doc.body, doc.url, function (err, body) {
				if (err && err['status-code'] === 409) {
					// document conflict (always happens if doc exists)
					database.get(doc.url, function (err, body) {
						if (err) {
							callback(err);
						}
						else {
							doc.body._id = body._id;
							doc.body._rev = body._rev;
							saveDoc(doc);
						}
					});
				}
				else if (err) {
					callback(err);
				}
				else {
					maybeReady(doc);
				}
			});
		};

		// Save our design doc if it doesn't exist or if
		// the version in the database is different from
		// the one we have in the code.
		designDocs.forEach(function (doc) {
			database.get(doc.url, function (err, body) {
				if (err && err['status-code'] === 404) {
					saveDoc(doc);	
				}
				else if (err) {
					callback(err);
				}
				else {
					if (body.version === doc.body.version) {
						// Up to date.
						maybeReady(doc);
					}
					else {
						saveDoc(doc);
					}
				}
			});
		});
	}(); // closure
};

exports.create = createViews;