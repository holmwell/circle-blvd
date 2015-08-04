'use strict';

function WelcomeCtrl(lib, session, hacks, $scope, $http, $location, errors) {

	var profileName = session.user.name || '';
	var circleId = session.activeCircle;
	var stories = CircleBlvd.Services.stories($http);

	var step = "1";

	var nextMeetingId = undefined;


	$scope.toNextStep = function () {
		var intStep = parseInt(step);
		intStep++;
		step = intStep.toString();
	};

	$scope.isStep = function (question) {
		return question === step;
	};

	$scope.finish = function () {
		// Make our story list like this:
		//   <initial tasks>
		//   Next meeting (black task)
		//   <later tasks>
		//   <milepost>
		var parseStory = function (line) {
			return lib.parseStory(line, {profileName: profileName});
		};

		var getLastStoryId = function () {
			return "last-" + circleId;
		};


		var addTasks = function (rawText, callback) {
			var initialTaskLines = rawText.split('\n');
			var tasksAdded = [];

			var addStory = function (index) {
				if (initialTaskLines.length > index) {
					var line = initialTaskLines[index];
					var story = parseStory(line);

					stories.insertFirst(story, circleId, function (newStory) {
						tasksAdded.push(newStory);
						stories.move(newStory, stories.get(nextMeetingId), function () {
							index++;
							if (index >= initialTaskLines.length) {
								// Done
								callback(tasksAdded);
							}
							else {
								addStory(index);
							}
						});
					});
				}
			};

			addStory(0);
		};

		addTasks($scope.initialTasksRawText, function () {
			addTasks($scope.laterTasksRawText, function (laterTasks) {

				var positionNextMeeting = function () {
					var done = function () {
						// TODO: Move this into some flow controller,
						// like flow.first()
						$location.path('/home/first');
					}

					if (laterTasks.length > 0) {
						var firstLaterTask = laterTasks[0];
						var nextMeeting = stories.get(nextMeetingId);
						stories.move(nextMeeting, firstLaterTask, function () {
							done();
						});
					}
					else {
						done();
					}					
				};

				var moveMilepostToEnd = function (callback) {
					var milepost = parseStory($scope.milepostRawText);
					milepost.isDeadline = true;
					var lastStory = {
						id: getLastStoryId() 
					};

					stories.insertFirst(milepost, circleId, function (newMilepost) {
						stories.move(newMilepost, lastStory, function () {
							callback();
						});
					});
				};

				moveMilepostToEnd(function () {
					positionNextMeeting();
				});

			});
		});
	};

	// TODO: Shares code with home.js
	var init = function() {
		if (circleId === undefined) {
			// What is happening? Nothing.
			$scope.signOut();
			return;
		}

		var handleInitError = function (data, status) {
			console.log('failure');
			console.log(status);
			console.log(data);

			if (status === 401 && $scope.isSignedIn()) {
				// We're not actually signed in.
				$scope.signOut();
			}
		};

		// Get the black task for building up the story
		// list after the welcome steps are complete.
		//
		// TODO: This should move to the stories service.
		$http.get('/data/' + circleId + '/stories')
		.success(function (serverStories) {
			stories.init(serverStories);
			for (var index in serverStories) {
				var story = serverStories[index];
				if (story.isNextMeeting) {
					nextMeetingId = story.id;
					return;
				}
			}
		})
		.error(handleInitError);
	};

	init();
}
WelcomeCtrl.$inject = ['lib', 'session', 'hacks', '$scope', '$http', '$location', 'errors'];