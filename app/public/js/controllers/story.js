function StoryCtrl($scope) {

	var isStory = function (story) {
		if (!story || story.isDeadline || story.isNextMeeting) {
			return false;
		}

		return true;
	};

	var isStoryStatus = function (story, status) {
		if (!isStory(story)) {
			return false;
		}

		if (story.status === status) {
			return true;
		}

		return false;
	}

	$scope.isStoryNew = function (story) {
		if (!isStory(story)) {
			return false;
		}

		if (!story.status || story.status === "") {
			return true;
		}

		return false;
	};

	$scope.isStorySad = function (story) {
		return isStoryStatus(story, "sad");
	};

	$scope.isStoryAssigned = function (story) {
		return isStoryStatus(story, "assigned");
	};

	$scope.isStoryActive = function (story) {
		return isStoryStatus(story, "active");
	};

	$scope.isStoryDone = function (story) {
		return isStoryStatus(story, "done");
	};

	$scope.isStoryMine = function (story) {
		if (story.owner && $scope.getAccountName) {
			var owner = story.owner.toLowerCase();
			var member = $scope.getAccountName();
			if (member) {
				member = member.toLowerCase();
				if (owner === member) {
					return true;
				}
			}
		}
		return false;
	};

	var statusOrder = ['sad','assigned','active','done'];
	$scope.bumpStatus = function (story) {
		if (story) {
			var index = statusOrder.indexOf(story.status);
			if (index > -1) {
				index++;
				if (index < statusOrder.length) {
					// TODO: This is defined in HomeCtrl
					$scope.setStoryStatus(story, statusOrder[index]);
				}
			}
			else {
				// Do this here so we can move from sad to 
				// assigned in one go
				if ($scope.isStoryNew(story)) {
					// TODO: This is defined in HomeCtrl
					$scope.setStoryStatus(story, 'assigned');
				};
			}
		}
	};
}
StoryCtrl.$inject = ['$scope'];