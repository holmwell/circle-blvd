var couch 	= require('./couch.js');
var encrypt = require('./encrypt.js');
var uuid 	= require('node-uuid');

var db = function() {

	var findStoriesByProjectId = function (projectId, callback) {

		var prepareStories = function (err, dbStories) {
			if (err) {
				return callback(err);
			}

			var stories = {};
			dbStories.forEach(function (story, index, array) {
				// TODO: Not sure we need this modelStory
				// business, except to cause more work
				// in the future.
				var modelStory = {
					id: story._id,
					summary: story.summary,
					projectId: story.projectId,
					nextId: story.nextId,
					isFirstStory: story.isFirstStory
				};

				stories[modelStory.id] = modelStory;

				// If there is nothing 'next', we're done.
				// TODO: Maybe. 
				// TODO: This assumes our data is all valid.
				if (!modelStory.nextId || modelStory.nextId === "last") {
					return false;
				}

				return true;
			});

			callback(err, stories);
		};

		couch.stories.findByProjectId(projectId, prepareStories);
	};

	var findStoriesByNextId = function (nextId, callback) {
		couch.stories.findByNextId(nextId, callback);
	};

	// Put this story into the linked-list backlog.
	// The story provided has the correct 'nextId',
	// but other metadata (like 'isFirstStory') is
	// in an unknown state.
	var insertStory = function (story, success, failure) {

		var finish = function (story) {
			console.log("Finishing ...");
			updateStory(story, success, failure);
		};

		var postInsert = function (story) {
			if (!story.nextId) {
				// We're the first story. Or the last story.
				// TODO: Figure that out.
				story.isFirstStory = true;
				return finish(story);
			}

			// Find the 'next' story. If the 'next' story is the
			// 'first' story, well, now our story is the first story
			// and the next story is not.
			couch.stories.findById(story.nextId, function (err, nextStory) {
				if (err) {
					console.log("Post-Insert: Failure to find by id");
					return failure(err);
				}

				if (!nextStory) {
					// TODO: Well ... this is fine ... but need to finish this code.
					return failure({
						message: "Finish this use case"
					})
				}

				if (nextStory.isFirstStory) {
					console.log("Next story IS first story ...");
					var updated = function () {
						console.log("Finishing story update ...");
						finish(story);
					};

					nextStory.isFirstStory = false;
					story.isFirstStory = true;
					console.log("Updating next story ...");
					return updateStory(nextStory, updated, failure);
				}
				else {
					console.log("Next story IS NOT first story ...");
					console.log(nextStory);
					// Nothing more needs to be done.
					return success(story);
				}
			});

			return finish(story);
		};

		couch.stories.add(story, function (err, body) {
			if (err) {
				return failure(err);
			}
			story.id = body.id;
			return postInsert(story);
		});
	};

	var addStory = function(story, success, failure) {
		if (!story.nextId) {
			// TODO: This probably means we're the first story on the block,
			// but it might also mean that the 'next' story was deleted by
			// someone else.
			// 
			// TODO: Work for the case where stories exist in the backlog
			// but we don't know about them.
			return insertStory(story, success, failure);
		}
		else { // story.nextId exists
			findStoriesByNextId(story.nextId, function (err, conflicts) {
				if (err) {
					console.log("Add: Failure to find by next id.");
					return failure(err);
				}

				if (conflicts.length === 0) {
					return insertStory(story, success, failure);
				}

				if (conflicts.length === 1) {
					// One other story is pointing to the same 'next'
					// story as we are. Cool. Let's point THAT story
					// for our 'next' story.

					// TODO: Don't use raw CouchDB stories.
					// In other words, we don't keep 'id' fields in the
					// database, and so we'll run into problems if we
					// just use the raw data.
					//
					// However, it's fine for now. (April 11)
					var conflict = conflicts[0];
					conflict.id = conflict._id;

					if (story.id !== conflict.id) {
						story.nextId = conflict.id;
						console.log("CONFLICT RESOLUTION");
						console.log(story.summary + " ----> " + conflict.summary);
						// It is possible there are conflicts with this new nextId,
						// so enter another addStory process.
						return addStory(story, success, failure);	
					}
					else {
						// Rather than create an infinite next-pointer
						// loop, let's fail the call.
						return failure({
							message: "Story is already present in database. You're probably fine?", 
							story_id: story.id
						});
					}
				}
				else {
					// There are too many things happening! It probably means
					// there are more than two people trying to add new stories
					// to the same project at the same time.
					// 
					// This situation should resolve itself if we just wait.
					// If it does not, well, there's a defect in our system.
					return failure({
						message: "Too many nextId conflicts. Doing nothing. " + 
							"We suggest waiting a few seconds and trying again.",
						story_id: story.id
					});
				}			
			});	
		}
	};

	var removeStory = function (story, success, failure) {
		couch.stories.remove(story, function (err) {
			if (err) {
				return failure(err);
			}
			success();
		});
	};

	var updateStory = function(story, success, failure) {
		couch.stories.update(story, function (err) {
			if (err) {
				console.log("Update-Story: Failure to update.");
				Error.stackTraceLimit = Infinity;
				throw new Error("whwwwttat");
				return failure(err);
			}
			success(story);
		});
	};

	var isValidUser = function(user) {
		return user && user.email && user.id;
	};

	var findUserByEmail = function(userEmail, callback) {
		couch.users.findByEmail(userEmail, callback);
	};

	var findUserById = function(id, callback) {
		couch.users.findById(id, callback);
	};

	var addUser = function(name, email, password, success, failure) {
		var user = {
			name: name,
			email: email,
			id: uuid.v4()
		};
		
		if (!isValidUser(user)) {
			return failure("User cannot be null?");
		}

		var addUser = function (user, password) {
			couch.users.add(user, password, function (err, body) {
				if (err) {
					return failure(err);
				}
				success();	
			});
		};

		findUserById(user.id, function (err, body) {
			// TODO: Handle db errors.
			if (body) {
				// TODO: Error codes, etc.
				// This is an internal error.
				return failure("User already exists.");
			}
			findUserByEmail(user.email, function (err, body) {
				if (body) {
					//TODO: Error?
					// This is an external error.
					return failure("User email already exists");
				}
				addUser(user, password);
			});
		});
	};
	
	var removeUser = function(user, success, failure) {
		if (!(user && user.email)) {
			return failure("User not found.");
		}

		couch.users.remove(user, function (err, body) {
			if (err) {
				return failure(err);
			}
			return success();
		});
	};

	var updateUser = function(user, success, failure) {
		if (!isValidUser(user)) {
			return failure();
		}

		couch.users.update(user, function (err) {
			if (err) {
				return failure(err);
			}
			success();
		});
	};

	var updateUserPassword = function(user, password, success, failure) {
		if (!isValidUser(user)) {
			return failure("Need a valid user. Sorry.");
		}

		couch.users.updatePassword(user, password, function (err) {
			if (err) {
				return failure(err);
			}
			success();
		});
	};

	var validateUserPassword = function(user, password, success, failure) {
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
	};

	return {
		stories: {
			add: addStory,
			remove: removeStory,
			findByProjectId: findStoriesByProjectId,
			update: updateStory
		},
		users: { 
			add: addUser,
			remove: removeUser,
			findByEmail: findUserByEmail,
			findById: findUserById, 
			update: updateUser,
			updatePassword: updateUserPassword,
			validatePassword: validateUserPassword,
			getAll: function(callback) {
				couch.users.getAll(callback);
			},
			count: function(callback) {
				couch.users.getAll(function (err, users) {
					var userCount = users ? users.length : null;
					callback(err, userCount);
				});
			}
		}
	};
}();


exports.instance = function() {
	return db;
};
