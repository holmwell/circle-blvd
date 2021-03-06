'use strict';

function HomeCtrl(lib, session, clipboard, hacks, $scope, $timeout, $http, $routeParams, $route, $rootScope, errors) {

	var circleId = session.activeCircle;

	var selectedChecklist = undefined;
	var checklistToAdd = undefined;

	$scope.profileName = session.user.name || '';
	$scope.isCircleInGoodStanding = true;

	$scope.$on('storyListBroken', function () {
		$scope.isBacklogBroken = true;
	});

	var updateBackBar = function () {
		if (!$scope.isMindset('detailed')) {
			$scope.showBackBar('Back to standard view');
		}
		else if ($scope.hideBackBar) {
			$scope.hideBackBar();
		}		
	};

	// Update now, listen for mindset events
	updateBackBar();

	$scope.$on('mindsetChanged', function () {
		updateBackBar();  

		var tasks = $scope.data && $scope.data.allStories;
		var deadlineCount = 0;
		var storyCount = 0;
		if (tasks) {
			for (var key in tasks) {
				if (tasks[key].isDeadline) {
					deadlineCount++;
				}
				storyCount++;
			}
		}

		$scope.isShowingRoadmapIntro = ($scope.isMindset('roadmap') 
			&& (storyCount < 5 || deadlineCount < 1))

		$scope.isShowingBumpIntro = ($scope.isMindset('bump') && storyCount < 15)
	});

	var entryPanel = function () {
		$scope.isAdding = [];
		$scope.isAdding['story'] = false;
		$scope.isAdding['deadline'] = false;

		$scope.showEntry = function (panelName) {
			$scope.hideSearch();

			if (!$scope.isCircleInGoodStanding) {
				// Do not show any specific entry 
				// if the circle does not have a sponsor.
				$scope.isAddingNew = true;
				return;
			}

			if (!panelName) {
				$scope.$broadcast('show-entry');
				$scope.isInserting = true;
				return;

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
		$scope.isInserting = undefined;
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

	// $scope.$on('show-entry', function () {
	// 	$scope.isInserting = true;
	// });

	$scope.$on('hide-entry', function () {
		$scope.hideEntry();
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

				var checklistText = getTaskListText(checklistToAdd);
				$scope.newChecklist = {};
				$scope.newChecklist.txt = checklistText;
				$timeout(function () {
					$scope.$broadcast('autosize-manual-resize');
				}, 0);

			}).error(errors.log);
		}).error(errors.log);
	};

	$scope.deselectChecklist = function () {
		$scope.displayChecklist = undefined;
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

	// Refactor: This is duplicated in StoryList.
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

	$scope.createMany = function (newMany, elementName) {
		if (!newMany) {
			return;
		}

		var input = newMany.txt;
		var lines = input.split('\n');

		if (!lines || lines.length === 0 || isCreatingStory) {
			return;
		}

		isCreatingStory = true;

		var protoTasks = [];
		var currentProtoTask = undefined;

		// Run through the lines again, to capture
		// all of the lines that start with '>',
		// which denote descriptions
		angular.forEach(lines, function (line) {
			if (line.trim().length === 0) {
				// Ignore empty lines.
			}
			else if (line[0] === '>') {
				if (currentProtoTask.description) {
					// Re-insert newlines in multi-line descriptions
					currentProtoTask.description += '\n';
				} 
				currentProtoTask.description += line.substring(1).trim();
			}
			else {
				if (currentProtoTask) {
					protoTasks.push(currentProtoTask);
				}
				currentProtoTask = {};
				currentProtoTask.line = line;
				currentProtoTask.description = '';
			}
		});
		if (currentProtoTask) {
			protoTasks.push(currentProtoTask);
		}

		var done = function () {
			if (elementName && elementName === 'checklist') {
				$scope.newChecklist = undefined;
				$scope.deselectChecklist();
			}
			else {
				$scope.newMany = undefined;	
			}
			isCreatingStory = false;
			$timeout(makeStoriesDraggable, 0);
		};

		var createStory = function (protoTask) {
			if (!protoTask.line) {
				return createNext();
			}

			var story = parseStory(protoTask.line);
			// TODO: Refactor out the $scope.<newMany || newChecklist>
			var prefix = '';
			var suffix = '';
			if (elementName && elementName === 'checklist') {
				prefix = $scope.newChecklist.prefix || '';
				suffix = $scope.newChecklist.suffix || '';
			}
			else {
				prefix = $scope.newMany.prefix || '';
				suffix = $scope.newMany.suffix || '';	
			}

			if (prefix) {
				prefix = prefix.trim() + ' ';	
			}
			if (suffix) {
				suffix = ' ' + suffix.trim();
			}

			story.summary = prefix + story.summary + suffix;
			
			story.description = protoTask.description;
			insertNewStory(story, createNext);
		};

		function createNext() {
			if (protoTasks.length === 0) {
				done();
				return;
			}

			var lastTask = protoTasks.pop();
			createStory(lastTask);
		}

		createNext();
	};

	function getTaskListText(tasks) {
		var pasteText = "";

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

			if (task.description) {
				var descriptionLines = task.description.split('\n');
				angular.forEach(descriptionLines, function (descriptionLine) {
					pasteText += ">" + descriptionLine;
					pasteText += "\n";
				});
			}
		});

		pasteText = pasteText.trim();
		return pasteText;
	}

	var pasteTasksToTextarea = function (event, element) {
		var startText = "";
		var textarea = event.target;
		var pasteText = "";

		if (!element) {
			console.log("pasteTasksToTextarea: No element specified.")
			return;
		}

		var tasks = clipboard.getCopiedTasks();
		pasteText = getTaskListText(tasks);

		if (element && element.txt) {
			startText = element.txt;
		}

		var index = textarea.selectionStart;
		element.txt = 
			startText.slice(0, textarea.selectionStart) + 
			pasteText + 
			startText.slice(textarea.selectionEnd);

		// Update our autosizing textarea.
		$timeout(function () {
			$scope.$broadcast('autosize-manual-resize');
		}, 0);
		
		event.preventDefault();
		event.stopPropagation();
	};

	$scope.checklistPaste = function (event, element) {
		if (!$scope.newChecklist) {
			$scope.newChecklist = {};
		}
		pasteTasksToTextarea(event, $scope.newChecklist);
	};

	$scope.manyPaste = function (event, element) {
		if (!$scope.newMany) {
			$scope.newMany = {};
		}
		pasteTasksToTextarea(event, $scope.newMany);
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
			var activeCircle = $scope.getActiveCircle();
			if (activeCircle) {
				$rootScope.pageTitle = activeCircle.name;
			}
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

			$http.get('/data/circle/' + circleId + '/standing')
			.success(function (standing) {
				// Where we stand with the billing department.
				// console.log(standing);

				$scope.circleSponsorName = standing.sponsorName;
				
				if (standing.state === 'good') {
					$scope.isCircleInGoodStanding = true;	
				}
				else {
					$scope.isCircleInGoodStanding = false;
				}
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

		// Reset entry panel
		$scope.isAddingNew = false;
		for (var pName in $scope.isAdding) {
			$scope.isAdding[pName] = false;
		}
		
		init();
	});

	init();
}
HomeCtrl.$inject = ['lib', 'session', 'clipboard', 'hacks', 
'$scope', '$timeout', '$http', '$routeParams', '$route', '$rootScope', 'errors'];
