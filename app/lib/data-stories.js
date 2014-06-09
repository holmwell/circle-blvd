var uuid = require('node-uuid');
var consumer = require('./queue-consumer.js');
var couch = require('./couch.js');
couch.stories = require('./couch-stories.js');

var events  = require('events');

module.exports = function () {
	var ee = new events.EventEmitter();

	var isFirstStoryCreated = function (story) {
		return !story.nextId;
	};

	var getLastId = function (story) {
		return ("last-" + story.projectId);
	}

	var isLastStory = function (story) {
		return story.nextId === getLastId(story);
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
					projectId: story.projectId,
					nextId: story.nextId || getLastId(story),
					isFirstStory: story.isFirstStory,

					summary: story.summary,
					owner: story.owner,
					status: story.status,
					description: story.description,
					isDeadline: story.isDeadline,
					isNextMeeting: story.isNextMeeting,
					createdBy: story.createdBy,
					comments: story.comments,
					isOwnerNotified: story.isOwnerNotified
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


	var postInsertStory = function (story, nextId, success, failure) {
		// Find the 'next' story. If the 'next' story is the
		// 'first' story, well, now our story is the first story
		// and the next story is not.
		couch.stories.findById(nextId, function (err, nextStory) {
			
			if (err) {
				console.log("Update-story-metadata: Failure to find by id");
				return failure(err);
			}

			if (!nextStory) {
				story.isFirstStory = true;
				return updateStory(story, success, failure); 
			}

			if (story.id === nextStory.id) {
				return failure({
					message: "Post-insert: Circular reference detected"
				});
			}

			var storiesToSave = {};
			story.nextId = nextId;

			var saveStories = function () {
				couch.stories.transaction(storiesToSave, function (err, response) {
					if (err) {
						return failure(err);
					}
					return success(story);
				});
			};

			if (nextStory.isFirstStory) {
				nextStory.isFirstStory = false;
				story.isFirstStory = true;
				
				storiesToSave[nextStory.id] = nextStory;
				storiesToSave[story.id] = story;

				saveStories();
			}
			else {
				console.log("Next story IS NOT first story ...");
				console.log(nextStory);
				
				storiesToSave[story.id] = story;

				couch.stories.findByNextId(nextId, function (err, previousStory) {
					if (err) {
						failure(err);
					}
					else {
						if (previousStory.nextId === story.id) {
							// Fine.
						}
						else {
							previousStory.nextId = story.id;
							storiesToSave[previousStory.id] = previousStory;
						}
						saveStories();
					}
				});
			}
		});
	};


	var getNextIdForInsert = function (story, proposedNextId, callback) {

		var foundNextId = function (nextId) {
			callback(null, nextId);
		};

		var failure = function (err) {
			callback(err, null);
		};

		if (isFirstStoryCreated(story) && !proposedNextId) {
			if (story.isNextMeeting) {
				// Ok, we're actually the first story created.
				foundNextId(getLastId(story));
			}
			else {
				// This probably means the first story was not specified.
				// Put it at the top of the backlog.
				getFirstStory(story.projectId, function (err, firstStory) {
					if (err) {
						return failure(err);
					}
					getNextIdForInsert(story, firstStory._id, callback);
				});
			}
		}
		else { 
			// story.nextId exists
			//
			// Look to see if there is already a story in the database
			// that is already pointing to the 'next' story we want to
			// point to.
			findStoriesByNextId(proposedNextId, function (err, conflicts) {
				if (err) {
					console.log("Add: Failure to find by next id.");
					return failure(err);
				}

				if (conflicts.length === 0) {
					return foundNextId(proposedNextId);
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
						console.log("CONFLICT RESOLUTION");
						console.log(story.summary + " ----> " + conflict.summary);
						// It is possible there are conflicts with this new nextId,
						// so enter another addStory process.
						return getNextIdForInsert(story, conflict.id, callback);
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

	var processStory = function (story, callback) {
		var proposedNextId = story.nextId || null;
				
		story.id = story._id;
		story.type = "story";

		getNextIdForInsert(story, proposedNextId, function (err, nextId) {
			if (err) {
				var error = {};
				error.err = err;
				error.message = "queue: get-next-id failure";
				callback(error);
				return;
			}

			story.nextId = nextId;
			couch.docs.update(story, function (err, processedStory) {
				if (err) {
					var error = {};
					error.err = err;
					error.message = "queue: update failure";
					error.fatal = true;
					// TODO: Make queue better
					callback(err);
					return;
				}

				postInsertStory(processedStory, processedStory.nextId, 
					function (postProcessedStory) {
						callback(null, postProcessedStory);
					},
					function (err) {
						console.log('queue: post-insert failure');
						console.log(err);
						error.fatal = true;
						callback(err);
					}
				);
			});
		});
	};

	var addStory = function (story, callback) {
		var thing = {
			id: uuid.v4(),
			action: 'add',
			params: {
				story: story
			}
		};

		var afterEnqueue = function (err) {
			if (err) {
				return callback(err);
			}
			// When the queue consumer is done with
			// our thing, we'll emit an event named
			// thing.id. and then we'll callback.
			ee.once(thing.id, function (err, newStory) {
				callback(err, newStory);
			});
		};

		consumer.enqueue(thing, afterEnqueue);
	};

	var handleAddThing = function (err, thing, callback) {
		var story = thing.params.story;
		if (err) {
			ee.emit(thing.id, err, story);
			return callback();
		}

		// Actually add the story to the database.
		// TODO: Need to rename 'addToQueue' ... 
		couch.stories.addToQueue(story, function (err, body) {
			if (err) {
				ee.emit(thing.id, err, story);
				return callback();
			}

			story._id = body.id;
			story._rev = body.rev;

			processStory(story, function (err, newStory) {
				if (err) {
					// TODO: We have an orphaned story. :-(
				}
				ee.emit(thing.id, err, newStory);
				return callback();
			});
		});
	};

	var processAllTheThings = function () {
		// All of them.
		var handleThings = function (err, thing, next) {
			// TODO: Handle errors. Right now we don't care,
			// because there are no errors thrown by
			// queue-async.
			if (thing.action === 'add') {
				handleAddThing(err, thing, next);
			}
		};

		consumer.consume(handleThings);
	};


	var getFirstStory = function (projectId, callback) {
		if (!projectId) {
			callback(null, null);
		}

		couch.stories.findFirst(projectId, callback);
	};

	var getNextMeeting = function (projectId, callback) {
		if (!projectId) {
			callback(null, null);
		}

		couch.stories.findNextMeeting(projectId, callback);
	};


	var moveStory = function (story, newNextId, success, failure) {
		var storiesToSave = {};
		var saveChecks = [];

		var addToStoriesToSave = function (s) {
			if (s) {
				if (storiesToSave[s.id]) {
					// This is a coding error and if it happens
					// there is a fixable issue below. Or maybe
					// rewrite this function so it is better.
					console.log("DUPLICATE SAVE. DOC CONFLICT. INTEGRITY BROKEN.");
					console.log(storiesToSave[s.id]);
					console.log(s);
					return false;
				}
				storiesToSave[s.id] = s;
			}
			return true;
		};

		var saveStories = function (integrityChecks) {
			if (integrityChecks) {
				var passesChecks = true;
				integrityChecks.forEach(function (check) {
					if (!check) {
						passesChecks = false;
					}
				});

				if (!passesChecks) {
					return failure({
						message: "Story move failed to pass integrity checks.",
						stories: storiesToSave
					});
				}
			}

			couch.stories.transaction(storiesToSave, function (err, response) {
				if (err) {
					// We maybe had some document conflicts and should
					// probably just try again.
					return failure(err);
				}
				success(story);
			});
		};

		couch.stories.findById(story.id, function (err, storyToMove) {
			if (err) {
				return failure(err);
			}
			if (!storyToMove) {
				return failure({
					message: "Sorry, the story you're trying to move was deleted by someone else.",
					story: story
				});
			}

			var lastId = getLastId(storyToMove);
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
						if (!storyE && newNextId !== lastId) {
							return failure({
								message: "Someone deleted the story you're trying "
								+ "to put this one in front of. Maybe refresh your story list "
								+ "and try again.",
								story: story
							});
						}
						couch.stories.findById(storyToMove.nextId, function (err, preMoveNextStory) {
							if (err) {
								return failure(err);
							}
							// This might happen if there is a ton of activity, I guess.
							if (!preMoveNextStory && storyToMove.nextId !== lastId) {
								return failure({
									message: "There is a lot of activity on the project. " +
									"Wait a little bit and try again.",
									story: story
								});
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
									saveChecks.push(addToStoriesToSave(preMovePreviousStory));
								}
								else if (preMoveNextStory) {
									// if there is no preMovePreviousStory, that
									// means storyToMove is the first story.
									//
									// So, the new first story is the preMoveNextStory.
									storyToMove.isFirstStory = false;
									preMoveNextStory.isFirstStory = true;
									saveChecks.push(addToStoriesToSave(preMoveNextStory));
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
										saveChecks.push(addToStoriesToSave(storyC));	
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
										saveChecks.push(addToStoriesToSave(firstStory));	
									}
								}

								saveChecks.push(addToStoriesToSave(storyToMove));
								saveStories(saveChecks);
							});
						});
					});
				});
			});
		});
	};

	var removeStory = function (story, success, failure) {

		couch.stories.findById(story.id, function (err, storyToRemove) {
			if (err) {
				return failure(err);
			}

			if (!storyToRemove) {
				// Story is already gone!
				return success();			
			}

			couch.stories.findByNextId(storyToRemove.id, function (err, previousStory) {
				if (err) {
					return failure(err);
				}

				couch.stories.findById(storyToRemove.nextId, function (err, nextStory) {
					if (err) {
						return failure(err);
					}

					var lastId = getLastId(storyToRemove);
					if (storyToRemove.nextId === lastId) {
						nextStory = {};
						nextStory.id = lastId;
					}
					else if (!nextStory) {
						// Someone deleted the nextStory before we could access it.
						// Server usage is heavy.
						return failure({
							message: "There is a lot of activity on the server right now. " 
							+ "Wait a little and try again."
						});
					}

					previousStory = previousStory ? previousStory[0] : null;

					var storyToSave;
					if (previousStory) {
						// most-common case
						previousStory.nextId = nextStory.id;
						storyToSave = previousStory;
					}
					else if (nextStory) {
						// TODO: assert(storyToRemove.isFirstStory);
						nextStory.isFirstStory = true;
						storyToSave = nextStory;
					}
					else {
						// nothing to do.
						return success();
					}

					couch.stories.update(storyToSave, function (err) {
						if (err) {
							return failure(err);
						}
						couch.stories.remove(story, function (err) {
							if (err) {
								return failure(err);
							}
							return success();
						});
					});
				});
			});
		});
	};

	var updateStory = function(story, success, failure) {
		couch.stories.update(story, function (err, body) {
			if (err) {
				// TODO: Clean this up
				console.log("Update-Story: Failure to update.");
				Error.stackTraceLimit = Infinity;
				// throw new Error("whwwwttat");
				return failure(err);
			}
			story._rev = body.rev;
			success(story);
		});
	};

	var markStoryOwnerNotified = function (story, success, failure) {
		couch.stories.findById(story.id, function (err, storyToSave) {
			if (err) {
				return failure(err);
			}

			storyToSave.isOwnerNotified = true;
			updateStory(storyToSave, success, failure);
		});
	};

	// 'Saving' a story is for persisting the things that a guest
	// would consider part of a story, like the summary and who
	// it is assigned to. Not for saving internal data.
	var saveStory = function (story, success, failure) {
		couch.stories.findById(story.id, function (err, storyToSave) {
			if (err) {
				return failure(err);
			}

			storyToSave.summary = story.summary;
			storyToSave.owner = story.owner;
			storyToSave.status = story.status || "";
			storyToSave.description = story.description;
			// isDeadline should not be changed
			// storyToSave.isDeadline = story.isDeadline;

			if (story.newComment) {
				storyToSave.comments = storyToSave.comments || [];
				storyToSave.comments.push(story.newComment);
			}

			updateStory(storyToSave, success, failure);
		});
	};

	// Turn on processing queue.
	// TODO: Probably put this in the API, to be called
	// at a higher level.
	processAllTheThings();

	return {
		add: addStory,
		markOwnerNotified: markStoryOwnerNotified,
		move: moveStory,
		remove: removeStory,
		findByProjectId: findStoriesByProjectId,
		// TODO: Maybe don't return the raw database object
		getFirstByProjectId: getFirstStory,
		getNextMeetingByProjectId: getNextMeeting,
		save: saveStory,
		fix: updateStory
	};
}(); // closure