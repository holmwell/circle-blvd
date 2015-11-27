'use strict';

function StoryCtrl(session, lib, $scope, $timeout, $element) {

	// Hide this element if it's not on the screen or within
	// our off-screen buffer. We do this so there is a limited
	// number of Angular watchers at any given time, as they
	// are expensive.
	function isElementInViewport (el) {
		return true;
		// Disable in roadmap view, for smooth scrolling 
		// across vast distances
		if (lib.mindset.is('roadmap')) {
			return true;
		}

	    //special bonus for those using jQuery
	    if (typeof jQuery === "function" && el instanceof jQuery) {
	        el = el[0];
	    }

	    var rect = el.getBoundingClientRect();
	    var bufferHeight = 800;

	    return (
	        rect.top >= -bufferHeight &&
	        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + bufferHeight /*or $(window).height() */
	    );
	}

	$scope.$on('viewportChanged', function () {
		var isOnScreen = isElementInViewport($element);
		if (isOnScreen !== $scope.isOnScreen) {
			$scope.isOnScreen = isOnScreen;
		}
	});

	$scope.isAndroid = function() {
        // return /Android/i.test(navigator.userAgent);
        return false;
    }(); // closure

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
		if (story.owner && $scope.accountName) {
			var owner = story.owner.toLowerCase();
			var member = $scope.accountName;
			if (member) {
				member = member.toLowerCase();
				if (owner === member) {
					return true;
				}
			}
		}
		return false;
	};

	$scope.setStoryStatus = function (story, status) {
		if (story) {
			story.status = status;			
			$scope.$emit('storyChanged', story);
		}
	};

	$scope.getStatusClass = function (story) {
		if (story.isDeadline) {
			return "deadline";
		}

		if (story.isNextMeeting) {
			return "next-meeting";
		}

		switch (story.status) {
			case "sad":
			case "assigned":
			case "active":
			case "done":
			    return story.status;
			default: 
				return "new";
		}
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

	$scope.isMindset = function (m) {
		if ($scope.mindset) {
			return $scope.mindset === m;
		}
		return lib.mindset.is(m);
	};

	$scope.moveToTop = function (e, story) {
		$scope.$emit('storyMovedToTop', story);
		isMovingToTop = false;
		e.stopPropagation();
		e.preventDefault();
	};

	var isMovingToTop = false;
	$scope.beforeMoveToTop = function (e, story) {
		// Remember state so that the remember highlight function
		// can know to not select our story.
		isMovingToTop = true;
	}

	var isDragging = false;
	$scope.$on('spIsDragging', function (e, val) {
		isDragging = val;
	});

	$scope.select = function (story) {
		if (isDragging || story.isBeingDragged) {
			// Do nothing. We're dragging. See the note
			// in 'drag:end' as to why.
			return;
		}

		// Do not refocus stuff if we're already on this story.
		if (!story.isSelected) {
			$scope.$emit('beforeStorySelected');
			story.isSelected = true;
			// TODO: Should this 'isHighlighted' change be here?
			// This might be better suited for a list operation?
			// Or is this even what we want to happen?
			// story.isHighlighted = false;
			$scope.$emit('storySelected', story);
		}	
	};

	var highlight = function (story) {
		// FYI: Stories will be highlighted when they are
		// selected (opened). This is the desired behavior for now.
		if (!story.isSelected) {
			$scope.$emit('storyHighlight', story, 'single');

			story.highlightedFrom = 'first';
			$scope.mouse.isHighlighting = true;
			$scope.mouse.lastMouseDownStory = story;
		}
	}

	$scope.highlight = function (story) {
		// Prevent drag operations from resetting our
		// selection
		if (story.isHighlighted) {
			$scope.mouse.isHighlighting = true;
			return;
		}
		highlight(story);
	};

	// Called on ng-mouseup
	//
	// This allows us to open (select) a story by clicking
	// on it once, when it is highlighted, instead of having
	// to double-click all over the place.
	$scope.rememberHighlight = function (story) {
		if ($scope.mouse.lastMouseUpStory && 
			$scope.mouse.lastMouseUpStory.id === story.id &&
			$scope.mouse.lastMouseUpStory.id === $scope.mouse.lastMouseDownStory.id &&

			!isMovingToTop) {
			$scope.select(story);
		}

		$scope.mouse.lastMouseUpStory = story;
	};

	// TODO: This is called N times. Move to list.
	$scope.$on('mouseUp', function () {
		$scope.mouse.isHighlighting = false; 
	});

	$scope.$on('labelSelected', function () {
		$scope.mouse.isHighlighting = false;
	});

	$scope.handleSingleClicks = function (story) {
		if ($scope.keyboard.isShiftDown || $scope.isScreenXs) {
			$scope.select(story);
			return;
		}

		highlight(story);
		$scope.mouse.isHighlighting = false; 
	};

	$scope.mouseEnter = function (story) {
		if ($scope.mouse.isHighlighting) {
			if (!story.isHighlighted) {
				$scope.$emit('storyHighlight', story);
			}
		}
		story.isOver = true;
	};

	$scope.mouseLeave = function (story) {
		if ($scope.mouse.isHighlighting) {
			if (story.isHighlighted && story.highlightedFrom !== 'first') {
				$scope.$emit('storyUnhighlight', story, $scope.mouse.direction);
			}
		}
		story.isOver = false;
	};

	$scope.deselect = function (story, event) {
		if (story && story.isSelected) {
			story.isSelected = false;
			
			$scope.$emit('storyDeselected', story, event);

			if (event) {
				event.stopPropagation();	
			}
		}
	};

	$scope.archive = function (story) {
		$scope.$emit('storyArchived', story);
	};

	$scope.remove = function (story) {
		$scope.$emit('storyRemoved', story);
	};

	$scope.notify = function (story, event) {
		$scope.$emit('storyNotify', story, event);
	};

	$scope.save = function (story, event) {
		$timeout(function () {
			$scope.deselect(story, event);	
		});
		$scope.$emit('storySaved', story);
	};

	$scope.saveComment = function (story, event) {
		$scope.$emit('storyCommentSaved', story);
	};

	$scope.getTimestampFilter = function (comment) {
		var date = new Date(comment.timestamp);
		var now = new Date();
		if (now.getDate() === date.getDate()
		&& now.getMonth() === date.getMonth()
		&& now.getFullYear() === date.getFullYear()) {
			// Today
			return "'at' h:mm a";
		}
		else if (now.getFullYear() === date.getFullYear()) {
			// This year
			return "'on' MMM d";
		}
		else {
			return "'on' MMM d, y";
		}
	};

	$scope.getStoryNoun = function (story) {
		if (story.isDeadline || story.isNextMeeting) {
			return 'milepost';
		}
		else {
			return 'task';
		}
	}; 

	$scope.isOwnerInCircle = function (owner) {
		if (!owner) {
			return false;
		}

		owner = owner.trim();
		// TODO: If this becomes a performance issue, 
		// which could be possible with many stories
		// and many owners, maybe make a table of owners.
		var owners = $scope.owners || [];
		for (var index in owners) {
			if (owners[index] === owner) {
				return true;
			}
		}

		return false;
	};

	$scope.isNotificationEnabled = function () {
		if (session.settings && session.settings['smtp-enabled'].value) {
			return true;
		}
		return false;
	};

	$scope.selectOwner = function (owner) {
		$scope.$emit('ownerSelected', owner);
	};
}
StoryCtrl.$inject = ['session', 'lib', '$scope', '$timeout', '$element'];