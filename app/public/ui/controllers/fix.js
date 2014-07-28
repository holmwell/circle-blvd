'use strict';

function FixCtrl(session, $scope, $http, $route, errors) {
	var projectId = session.activeCircle;
	var stories = [];
	var storiesHash = {};

	$scope.connectStories = function (firstStory, nextStory) {
		var body = {};
		body.story = firstStory;
		body.newNextId = nextStory.id;

		$http.put('/data/story/fix', body)
		.success(function (response) {
			$route.reload();
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	};

	var init = function() {
		$scope.stories = stories;

		$http.get('/data/' + projectId + '/first-story')
		.success(function (firstStory) {
			$scope.firstStory = firstStory;
			$http.get('/data/' + projectId + '/stories')
			.success(function (data) {

				stories = [];
				storiesHash = data;
				$scope.storiesHash = storiesHash;

				for (var storyId in data) {
					stories.push(data[storyId]);
				}
				$scope.stories = stories;

				var nextIdCounts = {};
				for (var storyId in data) {
					if (!nextIdCounts[data[storyId].nextId]) {
						nextIdCounts[data[storyId].nextId] = 1;
					}
					else {
						nextIdCounts[data[storyId].nextId]++;
						console.log(storyId);	
					}
				}
				$scope.nextIdCounts = nextIdCounts;

				var backlog = [];
				var processNextIdCounts = {};
				var currentStory = firstStory;
				while (currentStory) {
					if (nextIdCounts[currentStory.id] > 1) {
						currentStory.broken = "next-id-loop"
					}
					currentStory.isInGroup = true;
					backlog.push(currentStory); 

					var nextStoryId = currentStory.nextId;
					if (nextStoryId) {
						if (!processNextIdCounts[nextStoryId]) {
							processNextIdCounts[nextStoryId] = 1;
						}
						else {
							processNextIdCounts[nextStoryId]++;
						}

						if (processNextIdCounts[nextStoryId] === 1) {
							currentStory = storiesHash[nextStoryId];
						}
						else {
							currentStory = undefined;
						}
					}
					else {
						currentStory = undefined;
					}
				}
				$scope.backlog = backlog;

				var withoutPrevious = [];
				for (var i in data) {
					var hasPrevious = false;
					for (var j in data) {
						if (data[i].id == data[j].nextId) {
							hasPrevious = true;
							break;
						}
					}
					if (!hasPrevious && !data[i].isFirstStory) {
						withoutPrevious.push(data[i]);
					}
				};
				$scope.withoutPrevious = withoutPrevious;


				var firstStoryId = undefined;
				for (var storyId in data) {
					if (!data[storyId].isInGroup) {
						firstStoryId = storyId;	
						break;
					}
				}
				var groups = [];
				// see how far we go down starting at a 'random' story
				var firstGroup = [];
				var firstGroupHash = {};
				var currentStory = data[firstStoryId];
				while (currentStory) {
					currentStory.isInGroup = true;
					firstGroup.push(currentStory);
					firstGroupHash[currentStory.id] = currentStory;
					nextStory = data[currentStory.nextId];
					if (nextStory && !firstGroupHash[nextStory.id]) {
						currentStory = nextStory;	
					}
					else {
						currentStory = undefined;
					}
				}

				// see how far we can go up from that same story
				currentStory = firstGroup[0];
				while (currentStory) {
					var previousStoryFound = false;

					for (var storyId in data) {
						if (data[storyId].nextId === currentStory.id) {
							if (firstGroupHash[storyId]) {
								data[storyId].broken = true;
								firstGroup.splice(0, 0, data[storyId]);
								break;
							}
							else {
								previousStoryFound = true;
								currentStory = data[storyId];
								currentStory.isInGroup = true;
								firstGroup.splice(0, 0, currentStory);
								firstGroupHash[currentStory.id] = currentStory;
								break;
							}
						}
					}

					if (!previousStoryFound) {
						console.log(currentStory.summary);
						currentStory = undefined;
						break;
					}
				}
				groups.push(firstGroup);

				// Chaos!
				// for (var storyId in data) {
				// 	var currentGroup = [];
				// 	var currentGroupHash = {};
				// 	var currentStory = data[storyId];
				// 	var nextStory = undefined;
				// 	if (!currentStory.isInGroup) {
				// 		// First try to insert the story into an existing group
				// 		angular.forEach(groups, function (group, groupIndex) {
				// 			angular.forEach(group, function (story, storyIndex) {
				// 				if (currentStory.nextId === story.id) {
				// 					currentStory.isInGroup = true;
				// 					group.splice(storyIndex, 0, currentStory);
				// 				}
				// 			});
				// 		});

				// 		if (currentStory.isInGroup) {
				// 			continue;
				// 		}

				// 		while (currentStory) {
				// 			currentStory.isInGroup = true;
				// 			currentGroup.push(currentStory);
				// 			currentGroupHash[currentStory.id] = currentStory;
				// 			nextStory = data[currentStory.nextId];
				// 			if (nextStory && !currentGroupHash[nextStory.id]) {
				// 				currentStory = nextStory;	
				// 			}
				// 			else {
				// 				currentStory = undefined;
				// 			}
				// 		}
				// 		groups.push(currentGroup);
				// 	}
				// }
				$scope.groups = groups;

				if (withoutPrevious.length === 1
				&& firstGroup.length > 0
				&& firstGroup[0].id === withoutPrevious[0].id) {
					// This is great. We can probably fix this.
					$scope.hasSuggestion = true;
					$scope.lastBacklogStory = backlog.slice(-1)[0];	
					$scope.newNextStory = withoutPrevious[0];
				}
			})
			.error(function (data, status) {
				errors.log(data, status);
			});
		})
		.error(function (data, status) {
			errors.log(data, status);
			
			if (status === 401 && $scope.isSignedIn()) {
				// We're not actually signed in.
				$scope.signOut();
			}
		});
	};

	init();
} 
FixCtrl.$inject = ['session', '$scope', '$http', '$route', 'errors'];