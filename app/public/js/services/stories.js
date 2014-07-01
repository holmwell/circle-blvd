CircleBlvd.Services.stories = function ($http) {

	var s = {};
	var isFacade = false;

	var getStory = function (storyId) {
		return s[storyId];
	};

	var getLastStoryId = function (projectId) {
		return "last-" + projectId;
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

	var addStory = function (story, callback) {
		var onSuccess = function (newStory) {
			s[newStory.id] = newStory;
			callback(newStory);
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
			callback(null);
		});
	};


	var insertFirstStory = function (story, projectId, callback) {
		var hadFirstStoryPreviously = usefulStories.hasFirst();
		if (hadFirstStoryPreviously) {
			story.nextId = usefulStories.getFirst().id;	
		}

		story.projectId = projectId;
		story.type = "story";

		addStory(story, function (newStory) {
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
				if (callback) {
					callback(serverStory);
				}	
			}
			else if (callback) {
				callback();
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

		return {
			setFacade: function (val) {
				isFacade = val;
			},
			setFirst: usefulStories.setFirst,
			getFirst: usefulStories.getFirst,
			hasFirst: usefulStories.hasFirst,

			init: function (data) {
				s = data;
			},
			add: addStory,
			insertFirst: insertFirstStory,
			move: function (story, newNextStory, callback) {
				var body = {};
				body.story = story;

				if (newNextStory) {
					body.newNextId = newNextStory.id;
				}
				else {
					body.newNextId = getLastStoryId(story.projectId);
				}

				if (isFacade) {
					callback();
					return;
				}

				$http.put('/data/story/move', body)
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
			},
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