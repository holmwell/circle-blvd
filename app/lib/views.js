// views.js
//
// The design docs specific to Circle Blvd.
var nanoViews = require("./nano-views.js");

var usersDesignDoc = {
	url: '_design/users',
	body: 
	{
		version: "1.0.5",
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
			},
			byGroup: {
				map: function (doc) {
					if (doc.type === "user") {
						for (var i in doc.memberships) {
							var membership = doc.memberships[i];
							emit([membership.group, doc.name], doc);
						}	
					}

				}
			},
			byCircle: {
				map: function (doc) {
					if (doc.type === "user") {
						for (var i in doc.memberships) {
							var membership = doc.memberships[i];
							emit([membership.circle, doc.name], doc);
						}
					}
				},
				reduce: function (keys, values, rereduce) {
					if (rereduce) {
						return true;
					}
					return keys[0][0][1];
				}
			}
		}
	}
};
nanoViews.add(usersDesignDoc);

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
nanoViews.add(passwordsDesignDoc);


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
nanoViews.add(settingsDesignDoc);


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
nanoViews.add(circlesDesignDoc);


var groupsDesignDoc = {
	url: '_design/groups',
	body: 
	{
		version: "1.0.2",
		language: "javascript",
		views: {
			byCircleId: {
				map: function(doc) {
					if (doc.type === "group" 
						&& (doc.circleId || doc.projectId)) {
						emit(doc.circleId || doc.projectId, doc);
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
nanoViews.add(groupsDesignDoc);


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
nanoViews.add(queueDesignDoc);


var storiesDesignDoc = {
	url: '_design/stories',
	body: 
	{
		version: "1.0.13",
		language: "javascript",
		views: {
			byProjectId: {
				map: function(doc) {
					if (doc.type === "story" && doc.projectId) {
						doc.nextId = doc.nextId || "last-" + doc.projectId;
						emit(doc.projectId, doc);
					}
				}
			},

			byId: {
				map: function (doc) {
					if (doc.type === "story") {
						doc.nextId = doc.nextId || "last-" + doc.projectId;
						emit(doc._id, doc);
					}
				}
			},

			byIds: {
				map: function (doc) {
					if (doc.type === "story" && doc.projectId && doc._id) {
						// composite key using project and story id.
						var key = doc.projectId + "," + doc._id; 
						doc.nextId = doc.nextId || "last-" + doc.projectId;
						emit(key, doc);
					}
				}
			},

			byNextId: {
				map: function (doc) {
					if (doc.type === "story") {
						emit(doc.nextId || ("last-" + doc.projectId), doc);	
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
nanoViews.add(storiesDesignDoc);


var archivesDesignDoc = {
	url: '_design/archives',
	body: 
	{
		version: "1.0.1",
		language: "javascript",
		views: {
			byCircleId: {
				map: function (doc) {
					if (doc.type === "archive" && doc.projectId) {
						emit([doc.projectId, doc.sortIndex], doc);
					}
				}
			}
		}
	}
};
nanoViews.add(archivesDesignDoc);

var createViews = function (database, callback) {
	nanoViews.saveToDatabase(database, callback);
};

exports.create = createViews;