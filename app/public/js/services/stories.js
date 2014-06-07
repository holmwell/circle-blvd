CircleBlvd.Services.stories = function ($http) {

	var s = {};

	var getStory = function (storyId) {
		return s[storyId];
	};

	var saveStory = function (story, callback) {
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


	var insertFirstStory = function (story, projectId, callback) {
		var hadFirstStoryPreviously = usefulStories.hasFirst();
		if (hadFirstStoryPreviously) {
			story.nextId = usefulStories.getFirst().id;	
		}

		story.projectId = projectId;
		story.type = "story";

		serverStories.add(story, function (newStory) {
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

	// wrap around getting and setting the server-side stories,
	// so we can push to the server when we set things. there's
	// probably a better way / pattern for doing this. feel free
	// to implement it, future self.
	var stories = function() {

		return {
			setFirst: usefulStories.setFirst,
			getFirst: usefulStories.getFirst,
			hasFirst: usefulStories.hasFirst,

			init: function (data) {
				s = data;
			},
			add: function (story, callback) {
				$http.post('/data/story/', story)
				.success(function (newStory) {
					s[newStory.id] = newStory;
					callback(newStory);
				})
				.error(function (data, status) {
					// TODO: Show that something went wrong.
					// Most likely there was a data conflict
					// that could not be resolved.
					console.log(status);
					console.log(data);
					callback(null);
				});
			},
			insertFirst: insertFirstStory,
			move: function (story, newNextStory, callback) {
				var body = {};
				body.story = story;

				if (newNextStory) {
					body.newNextId = newNextStory.id;
				}
				else {
					body.newNextId = getLastStoryId();
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
			get: getStory, 
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
			}
		};
	}(); // closure;



	return stories;
};
CircleBlvd.Services.stories.$inject = ['$http'];