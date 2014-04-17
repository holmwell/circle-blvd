// views.js
//
// The design docs and views specific to Circle Blvd.
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


	var storiesDesignDoc = {
		url: '_design/stories',
		body: 
		{
			version: "1.0.10",
			language: "javascript",
			views: {
				byProjectId: {
					map: function(doc) {
						if (doc.type === "story" && doc.projectId) {
							doc.nextId = doc.nextId || "last";
							emit(doc.projectId, doc);
						}
					}
				},

				byId: {
					map: function (doc) {
						if (doc.type === "story") {
							doc.nextId = doc.nextId || "last";
							emit(doc._id, doc);
						}
					}
				},

				byIds: {
					map: function (doc) {
						if (doc.type === "story" && doc.projectId && doc._id) {
							// composite key using project and story id.
							var key = doc.projectId + "," + doc._id; 
							doc.nextId = doc.nextId || "last";
							emit(key, doc);
						}
					}
				},

				byNextId: {
					map: function (doc) {
						if (doc.type === "story") {
							emit(doc.nextId || "last", doc);	
						}
					}
				},

				firstsByProjectId: {
					map: function (doc) {
						if (doc.type === "story" && doc.projectId) {
							if (doc.isFirstStory) {
								emit(doc.projectId, doc);
							}
						}
					}
				}
			},

			validate_doc_update: function (newDoc, oldDoc, userCtx) {
				
				// Someone is trying to start a transaction involving
				// a list of documents.
				if (newDoc.transaction && !oldDoc.transaction) {	
					var transactionDocs = newDoc.transaction.docs;
					var isAllowed = false;
					var message = "Document is not part of the transaction.";

					for (var docIndex in transactionDocs) {
						if (transactionDocs[docIndex].id === newDoc._id) {
							if (transactionDocs[docIndex].rev === oldDoc._rev) {
								isAllowed = true;
								break;
							}
							else {
								message = "Document revision is not the latest.";
								throw({forbidden: message});
							}
						}
					}

					if (!isAllowed) {
						throw({forbidden: message});
					}
				}

				// Someone is in the middle of a transaction. 
				//
				// We are not doing ACID transactions. In other words,
				// transactions are not isolated, and only one is allowed
				// on a document at a time.
				if (newDoc.transaction && oldDoc.transaction) {
					if (newDoc.transaction.id === oldDoc.transaction.id) {
						// We're fine.
					}
					else {
						throw({forbidden: "A different transaction is in progress. Wait a little."})
					}
				}

				// Someone is trying to finish a transaction.
				// Or someone is trying to perform an operation on an
				// older document while we're doing a transaction.
				if (oldDoc.transaction && !newDoc.transaction) {
					if (newDoc.lastTransactionId === oldDoc.transaction.id) {
						// We're fine.
					}
					else {
						throw({forbidden: "Another transaction is in progress. Wait a little."});
					}
				}
			}
		}
	};
	designDocs.push(storiesDesignDoc);

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