var couch 	= require('./couch.js');
var encrypt = require('./encrypt.js');
var uuid 	= require('node-uuid');

var db = function() {

	var isFirstStoryCreated = function (story) {
		return !story.nextId;
	};

	var isLastStory = function (story) {
		return story.nextId === "last";
	};

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
					nextId: story.nextId || "last",
					isFirstStory: story.isFirstStory
				};

				stories[modelStory.id] = modelStory;

				// If there is nothing 'next', we're done.
				// TODO: Maybe. 
				// TODO: This assumes our data is all valid.
				if (isLastStory(modelStory)) {
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


	var postInsertStory = function (story, success, failure) {
		var finish = function (story) {
			console.log("Finishing ...");
			updateStory(story, success, failure);
		};

		if (isFirstStoryCreated(story)) {
			story.isFirstStory = true;
			story.nextId = "last";
			return finish(story);
		}

		// Find the 'next' story. If the 'next' story is the
		// 'first' story, well, now our story is the first story
		// and the next story is not.
		couch.stories.findById(story.nextId, function (err, nextStory) {
			if (err) {
				console.log("Update-story-metadata: Failure to find by id");
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
	};

	// var updateStoryLinks = function (story, success, failure) {
	// 	couch.stories.update(story, function (err, body) {
	// 		if (err) {
	// 			return failure(err);
	// 		}
	// 		return postInsertStory(story, success, failure);
	// 	});
	// };

	// Put this story into the linked-list backlog.
	// The story provided has the correct 'nextId',
	// but other metadata (like 'isFirstStory') is
	// in an unknown state.
	var insertStory = function (story, success, failure) {
		couch.stories.add(story, function (err, body) {
			if (err) {
				return failure(err);
			}
			story.id = body.id;
			return postInsertStory(story, success, failure);
		});
	};

	var addStory = function(story, success, failure) {
		if (isFirstStoryCreated(story)) {
			// TODO: This probably means we're the first story on the block,
			// but it might also mean that the 'next' story was deleted by
			// someone else.
			// 
			// TODO: Work for the case where stories exist in the backlog
			// but we don't know about them.
			return insertStory(story, success, failure);
		}
		else { // story.nextId exists
			// Look to see if there is already a story in the database
			// that is already pointing to the 'next' story we want to
			// point to.
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

	// var saveStory = function (story, success, failure, postInsert) {

	// 	if (postInsert) {
	// 		updateStory(story, function (updatedStory) {
	// 			postInsertStory(updatedStory, success, failure);
	// 		}, failure);			
	// 	}
	// 	else {
	// 		updateStory(story, success, failure);
	// 	}
	// };

	// var pointStoryToNewNext = function (story, newNextId, success, failure) {
	// 	// TODO: Need to do something if newNextId is undefined.

	// 	story.nextId = newNextId;
	// 	saveStory(story, success, failure);
	// 	return;

	// 	// Look to see if there is already a story in the database
	// 	// that is already pointing to the 'next' story we want to
	// 	// point to.
	// 	findStoriesByNextId(newNextId, function (err, conflicts) {
	// 		if (err) {
	// 			console.log("Add: Failure to find by next id.");
	// 			return failure(err);
	// 		}

	// 		if (conflicts.length === 0) {
	// 			story.nextId = newNextId;
	// 			console.log("NO CONFLICTS");
	// 			return saveStory(story, success, failure);
	// 		}

	// 		if (conflicts.length === 1) {
	// 			// One other story is pointing to the same 'next'
	// 			// story as we are. Cool. Let's point to THAT story
	// 			// for our 'next' story.

	// 			// TODO: Don't use raw CouchDB stories.
	// 			// In other words, we don't keep 'id' fields in the
	// 			// database, and so we'll run into problems if we
	// 			// just use the raw data.
	// 			//
	// 			// However, it's fine for now. (April 11)
	// 			var conflict = conflicts[0];
	// 			conflict.id = conflict._id;

	// 			if (story.id !== conflict.id) {
	// 				story.nextId = conflict.id;
	// 				console.log("CONFLICT RESOLUTION");
	// 				console.log(story.summary + " ----> " + conflict.summary);
	// 				// It is possible there are conflicts with this new nextId,
	// 				// so enter another addStory process.
	// 				return saveStory(story, success, failure);	
	// 			}
	// 			else {
	// 				// Rather than create an infinite next-pointer
	// 				// loop, let's fail the call.
	// 				return failure({
	// 					message: "Story is already present in database. You're probably fine?", 
	// 					story_id: story.id
	// 				});
	// 			}
	// 		}
	// 		else {
	// 			// There are too many things happening! It probably means
	// 			// there are more than two people trying to move stories
	// 			// around the same project at the same time.
	// 			// 
	// 			// This situation should resolve itself if we just wait.
	// 			// If it does not, well, there's a defect in our system.
	// 			return failure({
	// 				message: "Too many nextId conflicts. Doing nothing. " + 
	// 					"We suggest waiting a few seconds and trying again.",
	// 				story_id: story.id
	// 			});
	// 		}			
	// 	});	
	// };

	// var moveStoryOld = function (story, newNextId, success, failure) {
		
	// 	// Step 3.
	// 	var step3 = function (storyToMove) {
	// 		console.log("STEP 3");
	// 		findStoriesByNextId(storyToMove.nextId, function (err, nextIdMatches) {
	// 			if (err) {
	// 				console.log("Resolve conflicts: Failure to find by next id.");
	// 				return failure(err);
	// 			}

	// 			var conflicts = [];
	// 			nextIdMatches.forEach(function (nextIdMatch) {
	// 				if (nextIdMatch.id !== storyToMove.id) {
	// 					conflicts.push(nextIdMatch);
	// 				}
	// 			});

	// 			if (conflicts.length === 0) {
	// 				// Done.
	// 				return postInsertStory(storyToMove, success, failure);
	// 			}

	// 			if (conflicts.length === 1) {
	// 				var conflict = conflicts[0];
	// 				conflict.id = conflict._id; // might not need this.

	// 				conflict.nextId = storyToMove.id;
	// 				console.log("CONFLICT RESOLUTION");
	// 				console.log(conflict.summary + " ----> " + storyToMove.summary);
	// 				// It is possible there are conflicts with this new nextId,
	// 				// so enter another addStory process.
	// 				//
	// 				return saveStory(conflict, step3, failure);
	// 			}
	// 			else {
	// 				// There are too many things happening! It probably means
	// 				// there are more than two people trying to add new stories
	// 				// to the same project at the same time.
	// 				// 
	// 				// This situation should resolve itself if we just wait.
	// 				// If it does not, well, there's a defect in our system.
	// 				return failure({
	// 					message: "Too many nextId conflicts. Doing nothing. " + 
	// 						"We suggest waiting a few seconds and trying again.",
	// 					story_id: story.id
	// 				});
	// 			}			
	// 		});	
	// 	};

	// 	// Step 2.
	// 	var step2 = function () { // function (storyToMove) {
	// 		// Introduces a conflict: Now two things point to newNextId
	// 		console.log("STEP 2");
	// 		couch.stories.findById(story.id, function (err, storyToMove) {
	// 			if (storyToMove.nextId === newNextId) {
	// 				return failure({
	// 					message: "Preventing a next-id loop. Check your logic."
	// 				});
	// 			}
	// 			storyToMove.nextId = newNextId;
	// 			return saveStory(storyToMove, step3, failure);
	// 		});
	// 	};


	// 	var step1 = function (story) {
	// 		console.log("STEP 1");
	// 		// Make sure the moved story still exists.
	// 		couch.stories.findById(story.id, function (err, storyToMove) {
	// 			console.log("Finding " + story.summary + " ...");

	// 			if (!storyToMove) {
	// 				return failure({
	// 					message: "That story could not be found.",
	// 					story: story
	// 				});
	// 			}

	// 			// Find the stories that point to 'storyToMove'
	// 			findStoriesByNextId(storyToMove.id, function (err, nextMatches) {
	// 				console.log("Finding next matches for " + storyToMove.summary + " ...");
	// 				if (err) {
	// 					return failure(err);
	// 				}

	// 				if (!nextMatches || nextMatches.length === 0) {
	// 					// storyToMove is probably the first story in the backlog.
	// 					if (storyToMove.isFirstStory) {
	// 						// storyToMove.nextId is now the first story.
	// 						// storyToMove is not the first story.
	// 						couch.stories.findById(storyToMove.nextId, function (err, newFirstStory) {
	// 							if (err) {
	// 								return failure(err);
	// 							}

	// 							if (newFirstStory) {
	// 								newFirstStory.isFirstStory = true;
	// 								saveStory(newFirstStory, function() {
	// 									storyToMove.isFirstStory = false;
	// 									console.log("STEP 1A");
	// 									return saveStory(storyToMove, step2, failure);
	// 								}, 
	// 								failure);
	// 							}
	// 							else {
	// 								return failure({
	// 									message: "step1: what is happening??",
	// 									story: story
	// 								})
	// 							}
	// 						});
	// 					}
	// 					else {
	// 						return failure({
	// 							message: "The story moved has already been deleted!"
	// 						});	
	// 					}
	// 				}
	// 				else if (nextMatches.length === 1) {
	// 					var storyA = nextMatches[0];
	// 					console.log("STEP 1B");
	// 					return pointStoryToNewNext(storyA, storyToMove.nextId, step2, failure);
	// 				}
	// 				else {
	// 					return failure({
	// 						message: "Move-story: Too many things are happening."
	// 					})
	// 				}
	// 			});	
	// 		});
	// 	};

	// 	step1(story);
	// };

	var getFirstStory = function (projectId, callback) {
		if (!projectId) {
			callback(null, null);
		}

		couch.stories.findFirst(projectId, callback);
	};


	var moveStory = function (story, newNextId, success, failure) {
		var storiesToSave = {};
		var addToStoriesToSave = function (s) {
			if (s) {
				if (storiesToSave[s.id]) {
					console.log("DUPLICATE SAVE. DOC CONFLICT. INTEGRITY BROKEN.");
					console.log(storiesToSave[s.id]);
					console.log(s);
				}
				storiesToSave[s.id] = s;
			}
		};

		var saveStories = function () {
			var areWeDone = {};
			var hadAsyncFailure = false;

			var maybeSuccess = function () {
				console.log(areWeDone);

				for (var doneId in areWeDone) {
					if (!areWeDone[doneId]) {
						console.log("Not done with " + storiesToSave[doneId].summary);
						return;
					}
				}
				console.log("Move success.");
				success(story);
			};

			for (var storyId in storiesToSave) {
				areWeDone[storyId] = false;
			}

			for (var storyId in storiesToSave) {
				var storyToSave = storiesToSave[storyId];
				console.log("Saving " + storyToSave.summary + " ...");

				couch.stories.update(storyToSave, function (err, updateResponse) {
					if (err && !hadAsyncFailure) {
						hadAsyncFailure = true;
						console.log(err);
						failure(err);
					}
					else {
						areWeDone[updateResponse.id] = true;
						console.log("Saved " + storiesToSave[updateResponse.id].summary + ".");
						maybeSuccess();	
					}
				});
			}
		};

		couch.stories.findById(story.id, function (err, storyToMove) {
			if (err) {
				return failure(err);
			}
			couch.stories.findByNextId(storyToMove.id, function (err, preMovePreviousStory) {
				if (err) {
					return failure(err);
				}
				couch.stories.findByNextId(newNextId, function (err, storyC) {
					if (err) {
						return failure(err);
					}
					couch.stories.findById(newNextId, function (err, storyE) {
						if (err) {
							return failure(err);
						}
						couch.stories.findById(storyToMove.nextId, function (err, preMoveNextStory) {
							if (err) {
								return failure(err);
							}						
							getFirstStory(storyToMove.projectId, function (err, firstStory) {
								if (err) {
									return (failure);
								}

								// preMovePreviousStory ---> storyToMove ---> ... ---> storyC --> newLocation
								// TODO: We can parallelize this

								// Assume everything is found how we want it.
								preMovePreviousStory = preMovePreviousStory ? preMovePreviousStory[0] : null;
								storyC = storyC ? storyC[0] : null;
								storyE = storyE ? storyE[0] : null;

								if (preMovePreviousStory) {
									// base case
									preMovePreviousStory.nextId = storyToMove.nextId;	
									addToStoriesToSave(preMovePreviousStory);
								}
								else if (preMoveNextStory) {
									// if there is no preMovePreviousStory, that
									// means storyToMove is the first story.
									//
									// So, the new first story is the preMoveNextStory.
									storyToMove.isFirstStory = false;
									preMoveNextStory.isFirstStory = true;
									addToStoriesToSave(preMoveNextStory);									
								}
								
								storyToMove.nextId = newNextId;

								if (storyC) {
									// base case
									storyC.nextId = storyToMove.id;
									if (storiesToSave[storyC.id]) {
										storiesToSave[storyC.id].nextId = storyToMove.id;
									}
									else {
										storyC.nextId = storyToMove.id;
										addToStoriesToSave(storyC);	
									}
								}
								else {
									// storyToMove is moved to the first spot
									storyToMove.isFirstStory = true;
									// Sometimes preMovePreviousStory and FirstStory are the same.
									if (storiesToSave[firstStory.id]) {
										storiesToSave[firstStory.id].isFirstStory = false;
									}
									else {
										firstStory.isFirstStory = false;
										addToStoriesToSave(firstStory);	
									}
								}

								addToStoriesToSave(storyToMove);
								saveStories();
							});
						});
					});
				});
			});
		});
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
			move: moveStory,
			remove: removeStory,
			findByProjectId: findStoriesByProjectId,
			// TODO: Maybe don't return the raw database object
			getFirstByProjectId: getFirstStory,
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
