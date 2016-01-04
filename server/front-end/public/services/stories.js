CircleBlvd.Services.stories = function ($http) {

	var s = {};
	var isFacade = false;

	var getStory = function (storyId) {
		return s[storyId];
	};

	// fn(story) returns true
	var findStory = function (fn) {
		if (!fn) {
			return;
		}

		for (var storyId in s) {
			var story = s[storyId];
			if (fn(story)) {
				return story;
			}
		}
		
		return;
	};

	var getLastStoryId = function (story) {
		return "last-" + (story.listId || story.projectId);
	};

	var saveStory = function (story, callback) {
		if (isFacade) {
			if (callback) {
				callback(story);
			}
			return;
		}

		$http.put('/data/story/', story)
		.success(function (savedStory) {
			if (callback) {
				callback(savedStory);
			}
		})
		.error(function (data, status) {
			console.log(status);
			console.log(data);
		});
	};

	var saveStoryComment = function (story, comment, callback) {
		if (isFacade) {
			if (callback) {
				callback(story);
			}
			return;
		}

		var data = {};
		data.circleId = story.projectId;
		data.storyId = story.id;
		data.comment = comment;
		$http.put('/data/story/comment', data)
		.success(function (savedStory) {
			if (callback) {
				callback(savedStory);
			}
		})
		.error(function (data, status) {
			console.log(status);
			console.log(data);			
		});
	};

	var usefulStories = function() {
		var s = {};
		s.first = undefined;

		return {
			init: function () {
				s = {};
				s.first = undefined;				
			},
			setFirst: function (story) {
				if (s.first) {
					s.first.isFirstStory = false;
				}
				s.first = story;
				if (s.first) {
					s.first.isFirstStory = true;	
				}
			},
			getFirst: function () {
				return s.first;
			},
			hasFirst: function() {
				if (s.first) {
					return true;
				}
				else {
					return false;
				}
			}
		};
	}(); // closure

	var addStoryLocally = function (story) {
		s[story.id] = story;
	};

	var addStory = function (story, callback) {
		var onSuccess = function (newStory) {
			s[newStory.id] = newStory;
			callback(null, newStory);
		};

		if (isFacade) {
			// TODO: Need a faux id
			onSuccess(story);
			return;
		}

		$http.post('/data/story/', story)
		.success(onSuccess)
		.error(function (data, status) {
			// TODO: Show that something went wrong.
			// Most likely there was a data conflict
			// that could not be resolved.
			console.log(status);
			console.log(data);
			var id = "error-" + Date.now();
			var facade = null;
			if (status === 403) {
				var description = "Hi! Thanks for using Circle Blvd so much!\n\n" + 
				"Please tell Phil this is happening, and he'll fix this problem right away.";
				facade = {
					id: id,
					summary: data,
					description: description,
					type: "story"
				};
				s[id] = facade;
			}

			var err = {
				status: status,
				data: data
			};
			callback(err, facade);
		});
	};


	var insertFirstStory = function (story, projectId, listId, callback) {
		// optional param
		if (typeof(listId) === 'function') {
			callback = listId;
			listId = undefined;
		}

		var hadFirstStoryPreviously = usefulStories.hasFirst();
		if (hadFirstStoryPreviously) {
			story.nextId = usefulStories.getFirst().id;	
		}

		story.projectId = projectId;
		story.listId = listId;
		story.type = "story";

		var finish = function (err, newStory) {
			if (callback) {
				return callback(err, newStory);
			}
			return;
		};

		addStory(story, function (err, newStory) {
			if (err) {
				return finish(err, newStory);
			}

			if (newStory) {
				var serverStory = getStory(newStory.id);
				if (newStory.isFirstStory) {
					usefulStories.setFirst(serverStory);	
				}
				else {
					// TODO: Probably want to refresh the whole list 
					// from the server, because some crazy things are
					// happening!
				}
				return finish(null, serverStory);
			}
			else {
				return finish();
			}
		});
	};

	var isBacklogBroken = function () {
		var nextIdCounts = {};
		var isBroken = false;
		var currentStory = usefulStories.getFirst();
		while (currentStory && !isBroken) {
			if (!nextIdCounts[currentStory.id]) {
				nextIdCounts[currentStory.id] = 1;
			}
			else {
				nextIdCounts[currentStory.id]++;
				isBroken = true;
			}
			currentStory = getStory(currentStory.nextId);
		}

		return isBroken;
	};

	var getPreviousStory = function (story, serverStory) {
		var previousStory = story;
		if (usefulStories.getFirst().id === story.id) {
			return undefined;
		}

		if (isBacklogBroken()) {
			return null;
		}

		var currentStory = usefulStories.getFirst();
		while (currentStory) {
			if (currentStory.nextId === serverStory.id) {
				previousStory = currentStory;
				return previousStory;
			}
			currentStory = getStory(currentStory.nextId);
		}

		// TODO: If we get here, the story doesn't exist.
		return previousStory;
	};

	// wrap around getting and setting the server-side stories,
	// so we can push to the server when we set things. there's
	// probably a better way / pattern for doing this. feel free
	// to implement it, future self.
	var stories = function() {

		var moveBlock = function (startStory, endStory, newNextStory, callback) {
			var body = {};
			body.startStory = startStory;
			body.endStory = endStory;

			if (newNextStory) {
				body.newNextId = newNextStory.id;
			}
			else {
				body.newNextId = getLastStoryId(startStory);
			}

			if (isFacade) {
				callback();
				return;
			}

			$http.put('/data/story/move-block', body)
			.success(function (response) {
				// TODO: Move stuff around or something
				callback(null, response);
			})
			.error(function (data, status) {
				callback({
					status: status,
					data: data
				});
			});
		};

		return {
			setFacade: function (val) {
				isFacade = val;
			},
			setFirst: usefulStories.setFirst,
			getFirst: usefulStories.getFirst,
			hasFirst: usefulStories.hasFirst,

			init: function (data) {
				s = data;
				usefulStories.init();
			},
			local: {
				add: addStoryLocally
			},
			// Pretty sure 'add' isn't used anywhere.
			// We don't know because I suck. Anyway,
			// eventually we do want 'add' to be public,
			// so we can insert tasks at arbitrary 
			// places in the task list.
			// add: addStory,
			insertFirst: insertFirstStory,
			move: function (story, newNextStory, callback) {
				moveBlock(story, story, newNextStory, callback);
			},
			moveBlock: moveBlock,
			find: findStory,
			save: saveStory,
			saveComment: saveStoryComment,
			get: getStory, 
			getPrevious: getPreviousStory,
			set: function (storyId, story, callback) {
				if (s[storyId]) {
					s[storyId] = story;
					// update story
					stories.save(story, function (savedStory) {
						if (callback) {
							callback(savedStory);
						}
					});	
				}				
			},
			all: function() {
				return s;
			},
			remove: function (storyId) {
				// TODO: Right now the server-side is handled outside of
				// this class. Should probably make things be consistent. 
				if (s[storyId]) {
					delete s[storyId];
				}
			},
			isListBroken: isBacklogBroken
		};
	}(); // closure;



	return stories;
};
CircleBlvd.Services.stories.$inject = ['$http'];