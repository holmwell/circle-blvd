'use strict';

function HomeCtrl(session, hacks, $scope, $timeout, $http, $routeParams, $route) {

	var circleId = session.activeCircle;
	$scope.profileName = session.user.name || 'Phil';

	$scope.$on('storyListBroken', function () {
		$scope.isBacklogBroken = true;
	});

	var entryPanel = function () {
		$scope.isAdding = [];
		$scope.isAdding['story'] = false;
		$scope.isAdding['deadline'] = false;

		$scope.showEntry = function (panelName) {
			if (!panelName) {
				$scope.isAddingNew = true;
				$scope.showEntry('story');
				// TODO: Focus for all the story types
				hacks.focus('storyEntry');
			}
			else {
				for (var pName in $scope.isAdding) {
					$scope.isAdding[pName] = false;
				}
				$scope.isAdding[panelName] = true;
				hacks.focus(panelName + 'Entry');
			}
		};

		$scope.hideEntry = function () {
			$scope.isAddingNew = undefined;
		};

		$scope.toggleAltMode = function () {
			if ($scope.isManualAltMode) {
				$scope.isManualAltMode = false;
			}
			else {
				$scope.isManualAltMode = true;
			}
		}	
	}();

	var insertNewStory = function (newStory, callback) {
		$scope.$broadcast('insertNewStory', newStory, callback);
	};

	var parseStory = function (line) {
		var story = {};

		line = line.trim();
		// Parse mileposts
		if (line.indexOf('--') === 0) {
			story.isDeadline = true;
			// Remove all preceding hyphens,
			// so mileposts denoted with '----' 
			// are also possible.
			while (line.indexOf('-') === 0) {
				line = line.substring(1);
			}
			line = line.trim();
		}

		// Parse owners
		var owners = $scope.owners;
		var ownerFound = story.isDeadline || false;
		var lowerCaseLine = line.toLowerCase();
		owners.forEach(function (owner) {
			if (ownerFound) {
				return;
			}
			var lowerCaseOwner = owner.toLowerCase();
			// owners start with the @ sign and
			// are at the end of the line
			var ownerIndex = lowerCaseLine.indexOf(lowerCaseOwner);
			if (ownerIndex > 0 
				&& line[ownerIndex-1] === '@'
				&& line.length === ownerIndex + owner.length) {
				ownerFound = true;
				story.owner = owner;
				line = line.substring(0, ownerIndex-1).trim();
			}
		});

		story.summary = line;
		return story;
	};

	var isCreatingStory = false;
	$scope.create = function (line) {
		if (!isCreatingStory && line) {
			isCreatingStory = true;
			var newStory = parseStory(line);
			insertNewStory(newStory, function () {
				$scope.newStory = undefined;
				isCreatingStory = false;
				$timeout(makeStoriesDraggable, 0);
			});	
		}
	};

	$scope.createDeadline = function (newDeadline) {
		if (!isCreatingStory && newDeadline) {
			isCreatingStory = true;
			newDeadline.isDeadline = true;
			insertNewStory(newDeadline, function () {
				$scope.newDeadline = undefined;
				isCreatingStory = false;
				$timeout(makeStoriesDraggable, 0);
			});	
		}
	};

	$scope.createMany = function (newMany) {
		var input = newMany.txt;
		var lines = input.split('\n');

		if (!lines || lines.length === 0 || isCreatingStory) {
			return;
		}

		isCreatingStory = true;

		var lineIndex = lines.length-1;
		var lastLine = lines[lineIndex];

		var done = function () {
			$scope.newMany = undefined;
			isCreatingStory = false;
			$timeout(makeStoriesDraggable, 0);
		};

		var createStory = function (line) {
			if (!line) {
				return done();
			}

			var story = parseStory(line);
			insertNewStory(story, function () {
				lineIndex--;
				if (lineIndex >= 0) {
					createStory(lines[lineIndex]);
				}
				else {
					done();
				}
			});
		};

		createStory(lastLine);
	};

	var scrollToStorySpecifiedByUrl = function () {
		var storyId = $routeParams.storyId;
		if (!storyId) {
			return;
		}

		$scope.$broadcast('scrollToStory', storyId);
	};

	var makeStoriesDraggable = function () {
		$scope.$broadcast('makeStoriesDraggable');
	};


	var addKeyListener = function () {
		$scope.$watch('keyboard.isShiftDown', function (newValue, oldValue) {
			$scope.isAltMode = newValue;
			// UX: Maybe once something is marked as 'isMoving' it
			// should stay that way until the page is revisited. This
			// way people can change their minds on which milestone
			// things go to and it's no big deal.
			//
			// if (!newValue) {
			// 	stories.forEach(function (story) {
			// 		story.isMoving = false;
			// 	});
			// }
		});
	};

	var init = function() {
		$scope.owners = [];

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

		$http.get('/data/' + circleId + '/first-story')
		.success(function (firstStory) {

			$http.get('/data/' + circleId + '/stories')
			.success(function (serverStories) {
				if ($scope.getAccountName) {
					$scope.accountName = $scope.getAccountName();	
				}
				$scope.data = {
					firstStory: firstStory,
					allStories: serverStories,
					circleId: circleId
				};
				$timeout(makeStoriesDraggable, 0);
				scrollToStorySpecifiedByUrl();

				// UX: Hide story-entry panel at first.
				// $timeout(function() {
				// 	$scope.showEntry('many');
				// }, 300);
			})
			.error(handleInitError);

			$http.get("/data/" + circleId + "/members/names")
			.success(function (names) {
				$scope.owners = names;
			})
			.error(handleInitError);

		}).error(handleInitError);

		
		// $scope.$on('$viewContentLoaded', function (e) {
		// 	activateDragAndDrop();
		// });

		addKeyListener();
	};

	init();
}
HomeCtrl.$inject = ['session', 'hacks', 
'$scope', '$timeout', '$http', '$routeParams', '$route'];
