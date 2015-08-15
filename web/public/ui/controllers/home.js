'use strict';

function HomeCtrl(lib, session, hacks, $scope, $timeout, $http, $routeParams, $route, $rootScope, errors) {

	var circleId = session.activeCircle;

	var selectedChecklist = undefined;
	var checklistToAdd = undefined;

	$scope.profileName = session.user.name || '';

	$scope.$on('storyListBroken', function () {
		$scope.isBacklogBroken = true;
	});

	var entryPanel = function () {
		$scope.isAdding = [];
		$scope.isAdding['story'] = false;
		$scope.isAdding['deadline'] = false;

		$scope.showEntry = function (panelName) {
			$scope.hideSearch();
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
	}();

	$scope.hideEntry = function () {
		$scope.isAddingNew = undefined;
	};

	$scope.$watch('searchEntry', function (val) {
		$scope.$broadcast('cbSearchEntry', val);
	});

	$scope.showSearch = function () {
		$scope.isSearching = true;
		$scope.isAddingNew = undefined;
		hacks.focus('searchEntry');
	};

	$scope.hideSearch = function () {
		$scope.isSearching = undefined;
		$scope.searchEntry = undefined;
	};

	$scope.$on('keyEscape', function (e) {
		if ($scope.isSearching) {
			$scope.hideSearch();
		}
		if ($scope.isAddingNew) {
			$scope.hideEntry();
		}
	}); 

	$scope.selectOwner = function (owner) {
		$scope.$broadcast('ownerSelected', owner);
	};

	$scope.$on('ownerSelected', function (e, owner) {
		$scope.selectedOwner = owner;
	});

	$scope.setSearchBarLabel = function (text) {
		$scope.searchBarLabel = text;
	};

	$scope.selectChecklist = function (list) {
		$scope.checklistDescription = list.description;
		selectedChecklist = list;

		$http.get('/data/' + circleId + '/' + selectedChecklist._id + '/stories')
		.success(function (checklistTable) {
			$http.get('/data/' + circleId + '/' + selectedChecklist._id + '/first-story')
			.success(function (firstStory) {

				checklistToAdd = [];
				var currentStory = firstStory;

				while (currentStory) {
					checklistToAdd.push(currentStory); // <3 pass by reference	

					var nextStoryId = currentStory.nextId;
					currentStory = checklistTable[nextStoryId];
				}

				$scope.displayChecklist = checklistToAdd;

			}).error(errors.log);
		}).error(errors.log);
	};

	$scope.isSelectedChecklist = function (list) {
		if (!selectedChecklist) {
			return false;
		}

		return list._id === selectedChecklist._id;
	};

	// TODO: Refactor, of course
	$scope.addSelectedChecklist = function () {
		if (!isCreatingStory && selectedChecklist) {
			isCreatingStory = true;

								
			var storyIndex = checklistToAdd.length-1;
			var lastStory = checklistToAdd[storyIndex];

			var done = function () {
				selectedChecklist = undefined;
				isCreatingStory = false;
				$timeout(makeStoriesDraggable, 0);
			};

			var createStory = function (story) {
				if (!story) {
					return done();
				}

				insertNewStory(story, function () {
					storyIndex--;
					if (storyIndex >= 0) {
						createStory(checklistToAdd[storyIndex]);
					}
					else {
						done();
					}
				});
			};

			createStory(lastStory);
		}
	};

	var insertNewStory = function (newStory, callback) {
		$scope.$broadcast('insertNewStory', newStory, callback);
	};

	var parseStory = function (line) {
		return lib.parseStory(line, $scope);
	};

	var isCreatingStory = false;
	$scope.create = function (task) {
		if (!isCreatingStory && task && task.summary) {
			isCreatingStory = true;
			var newStory = parseStory(task.summary);
			newStory.description = task.description;
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

	$scope.manyPaste = function (event) {
		var startText = "";
		var textarea = event.target;
		var pasteText = "";

		var tasks = lib.getCopiedTasks();
		if (tasks.length === 0) {
			return;
		}

		tasks.forEach(function (task) {
			var line = "";
			if (task.isDeadline) {
				line += "-- ";
			}
			line += task.summary;
			if (task.owner) {
				line += " @" + task.owner;
			}
			line += "\n";

			pasteText += line;
		});

		pasteText = pasteText.trim();

		if ($scope.newMany && $scope.newMany.txt) {
			startText = $scope.newMany.txt;
		}
		else {
			$scope.newMany = {};	
		}

		var index = textarea.selectionStart;
		$scope.newMany.txt = 
			startText.slice(0, textarea.selectionStart) + 
			pasteText + 
			startText.slice(textarea.selectionEnd);

		event.preventDefault();
		event.stopPropagation();
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

	var maybeShowWelcomeMessage = function () {
		if ($routeParams.displayType === "first") {
			$scope.isFirstView = true;
		}
	};

	var init = function() {
		$scope.owners = [];

		if (circleId === undefined) {
			// What is happening? Nothing.
			$scope.signOut();
			return;
		}

		// Set page title
		if ($scope.getActiveCircle) {
			$rootScope.pageTitle = $scope.getActiveCircle().name;
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
					circleId: circleId,
					circle: $scope.getActiveCircle()
				};
				// Event: See 'storyListBuilt' below
			})
			.error(handleInitError);

			$http.get("/data/" + circleId + "/members/names")
			.success(function (names) {
				$scope.owners = names;
			})
			.error(handleInitError);

			$http.get('/data/' + circleId + '/lists')
			.success(function (data) {
				// Sort by name ...
				data.sort(function compare (a, b) {
					return a.name.localeCompare(b.name);
				});

				$scope.checklists = data;
			})
			.error(handleInitError);

		}).error(handleInitError);

		
		// $scope.$on('$viewContentLoaded', function (e) {
		// 	activateDragAndDrop();
		// });

		addKeyListener();
	};

	$scope.$on('storyListBuilt', function () {
		scrollToStorySpecifiedByUrl();
		maybeShowWelcomeMessage();

		// UX: Hide story-entry panel at first.
		// $timeout(function() {
		// 	$scope.showEntry('many');
		// }, 300);
	});

	$scope.$on('circleChanged', function () {
		circleId = session.activeCircle;
		init();
	});

	init();
}
HomeCtrl.$inject = ['lib', 'session', 'hacks', 
'$scope', '$timeout', '$http', '$routeParams', '$route', '$rootScope', 'errors'];
