function HomeCtrl(session, hacks, $scope, $timeout, $http, $routeParams, $route) {

	var circleId = session.activeCircle;

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

	var isCreatingStory = false;
	$scope.create = function (newStory) {
		if (!isCreatingStory && newStory) {
			isCreatingStory = true;
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
			})
			.error(handleInitError);

			$http.get("/data/" + circleId + "/users/names")
			.success(function (names) {
				$scope.owners = names;
			})
			.error(handleInitError);

		}).error(handleInitError);

		
		// $scope.$on('$viewContentLoaded', function (e) {
		// 	activateDragAndDrop();
		// });

		addKeyListener();
		// UX: Hide story-entry panel at first.
		// $scope.showEntry();
	};

	init();
}
HomeCtrl.$inject = ['session', 'hacks', 
'$scope', '$timeout', '$http', '$routeParams', '$route'];
