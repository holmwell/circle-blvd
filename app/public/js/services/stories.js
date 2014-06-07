CircleBlvd.Services.stories = function ($http) {

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

	// wrap around getting and setting the server-side stories,
	// so we can push to the server when we set things. there's
	// probably a better way / pattern for doing this. feel free
	// to implement it, future self.
	var serverStories = function() {
		var s = {};

		return {
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
			get: function (storyId) {
				return s[storyId];
			},
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

	return serverStories;
};
CircleBlvd.Services.stories.$inject = ['$http'];