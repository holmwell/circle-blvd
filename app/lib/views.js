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
			version: "1.0.1",
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
				},
				byName: {
					map: function (doc) {
						if (doc.type === "user") {
							if (doc.name) {
								emit(doc.name.toLowerCase(), doc);
							}
							else {
								emit("", doc);
							}
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


	var settingsDesignDoc = {
		url: '_design/settings',
		body: 
		{
			version: "1.0.4",
			language: "javascript",
			views: {
				'authorized': {
					map: function (doc) {
						if (doc.type === "setting") {
							if (doc.visibility === "public" 
							 || doc.visibility === "private") {
								emit(doc.name, doc);
							}
							else if (doc.visibility === "secret") {
								var setting = {};
								for (var prop in doc) {
									setting[prop] = doc[prop];
								}
								// Do not expose the value of secret settings
								setting.value = undefined;
								emit(doc.name, setting);
							}
						}
					}
				},
				'public': {
					map: function (doc) {
						if (doc.type === "setting") {
							if (doc.visibility === "public") {
								emit(doc.name, doc);	
							}
						}
					}
				},
				'private': {
					map: function (doc) {
						if (doc.type === "setting") {
							if (doc.visibility === "private") {
								emit(doc.name, doc);
							}
						}
					}
				},
				'all': {
					map: function (doc) {
						if (doc.type === "setting") {
							emit(doc.name, doc);	
						}
					}
				}
			}
		}
	};
	designDocs.push(settingsDesignDoc);


	var circlesDesignDoc = {
		url: '_design/circles',
		body: 
		{
			version: "1.0.0",
			language: "javascript",
			views: {
				byName: {
					map: function(doc) {
						if (doc.type === "circle") {
							emit(doc.name, doc);
						}
					}
				},

				byId: {
					map: function (doc) {
						if (doc.type === "circle") {
							emit(doc._id, doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(circlesDesignDoc);


	var groupsDesignDoc = {
		url: '_design/groups',
		body: 
		{
			version: "1.0.1",
			language: "javascript",
			views: {
				byProjectId: {
					map: function(doc) {
						if (doc.type === "group" && doc.projectId) {
							emit(doc.projectId, doc);
						}
					}
				},

				byId: {
					map: function (doc) {
						if (doc.type === "group") {
							emit(doc._id, doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(groupsDesignDoc);


	var queueDesignDoc = {
		url: '_design/queue',
		body: {
			version: "1.0.0",
			language: "javascript",
			views: {
				byTimestamp: {
					map: function (doc) {
						if (doc.type === "story-queue") {
							emit(doc.timestamp, doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(queueDesignDoc);


	var storiesDesignDoc = {
		url: '_design/stories',
		body: 
		{
			version: "1.0.12",
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
				},

				nextMeetingByProjectId: {
					map: function (doc) {
						if (doc.type === "story" && doc.projectId) {
							if (doc.isNextMeeting) {
								emit(doc.projectId, doc);
							}
						}
					}
				}
			},

			validate_doc_update: function (newDoc, oldDoc, userCtx) {
				if (!newDoc || !oldDoc) {
					// do nothing.
					return;
				}

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


	var archivesDesignDoc = {
		url: '_design/archives',
		body: 
		{
			version: "1.0.0",
			language: "javascript",
			views: {
				byProjectId: {
					map: function (doc) {
						if (doc.type === "archive" && doc.projectId) {
							emit([doc.projectId, doc.sortIndex], doc);
						}
					}
				}
			}
		}
	};
	designDocs.push(archivesDesignDoc);


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