function StoryListCtrl($scope, $timeout, $http, $location, $route, $document, $interval, lib, hacks, errors) {
	var circleId = undefined;
	var listId = undefined;

	var selectedStory = undefined;
	var storiesList = [];
	var stories = CircleBlvd.Services.stories($http);
	var isFacade = false;
	var isChecklist = false;
	var searchEntry = undefined;

	var selectedOwner = undefined;
	$scope.selectedOwner = selectedOwner;

	var selectedLabels = [];
	$scope.selectedLabels = selectedLabels;

	var highlightedStories = [];
	var clipboardStories = [];
	var teamHighlightedStories = {};

	var isMovingTask = false;
	var storyBeingInserted = undefined;

	// TODO: Possibly make it so this isn't just on page load
	var visibilityHelper = $('#visibilityHelper');
	if (visibilityHelper.is(':hidden')) {
		$scope.isScreenXs = true;
	}
	else {
		$scope.isScreenXs = false;
	}

	var didScroll = false;
	$document.bind('scroll', function (e) {
		didScroll = true;
	}); 

	$interval(function () {
		if (didScroll) {
			didScroll = false;
			$timeout(function () {
				$scope.$broadcast('viewportChanged');
			}, 50);
		}
	}, 200);

	// HACK: Until we can figure out how to stop this properly,
	// reload the page when this happens.
	var handleHierarchyRequestErr = function (e) {
		errors.log("Hierarchy request error. Reloading page.");
		$route.reload();
	};

	var buildMilepostList = function (list) {
		var milepostList = [];
		list.forEach(function (story) {
			if (story.isDeadline || story.isNextMeeting) {
				milepostList.push({
					id: story.id,
					summary: story.summary,
					isDeadline: story.isDeadline,
					isNextMeeting: story.isNextMeeting,
					isAfterNextMeeting: story.isAfterNextMeeting,
					isInRoadmap: true
				});
			}
		});

		$scope.mileposts = milepostList;
	};

	var buildStoryList = function (firstStory, serverStories, buildDelay) {
		storiesList = [];

		stories.init(serverStories);
		// Empty list ... 
		if (Object.keys(serverStories).length === 0) {
			$scope.stories = storiesList;
			return;
		}

		if (!firstStory) {
			errors.log("The list contains stories but a first story was not specified");
			return;
		}

		stories.setFirst(stories.get(firstStory.id));
		stories.get(firstStory.id).isFirstAtLoad = true;

		if (stories.isListBroken()) {
			$scope.$emit('storyListBroken');
			return;
		}

		$scope.stories = storiesList;

		// TODO: If we don't have a first story, relax.
		var currentStory = stories.getFirst();
		var isAfterNextMeeting = false;


		var addAndGetNextStory = function (currentStory) {
			storiesList.push(currentStory); // <3 pass by reference	

			if (isAfterNextMeeting) {
				currentStory.isAfterNextMeeting = true;
			}
			else if (currentStory.isNextMeeting) {					
				isAfterNextMeeting = true;
			}

			var nextStoryId = currentStory.nextId;
			if (nextStoryId) {
				currentStory = stories.get(nextStoryId);
			}
			else {
				currentStory = undefined;
			}

			return currentStory;
		};


		// Add the first 10 stories immediately, so that
		// the view renders as soon as possible.
		var count = 0;
		while (currentStory) {
			currentStory = addAndGetNextStory(currentStory);
			if (count > 10) {
				break;
			}
			count++;
		}


		// We build the list slowly by adding elements to the view
		// 10 at a time, so that the UI doesn't lock up while the
		// page is loading. 
		//
		// This means the page will take a full two seconds to load
		// if there are 200 items. We'll want to address this need
		// in the future, but at this point in development, where
		// not many people have large projects, I think this is a 
		// reasonable limitation.
		var buildListSlowly = function () {
			var delay = 100;
			var increment = 10;

			if (typeof(buildDelay) !== undefined) {
				delay = buildDelay;
			}
 
			$timeout(function () {
				var count = 0;
				while (currentStory) {
					currentStory = addAndGetNextStory(currentStory);
					if (count > increment) {
						buildListSlowly();
						break;
					}
					count++;
				}

				if (!currentStory) {
					$scope.$emit('storyListBuilt');
				}
			}, delay);
		};

		buildListSlowly();
		
		// For designing
		// $scope.select(stories.getFirst());
	};

	var findNextMeeting = function () {
		return stories.find(function (story) {
			return story.isNextMeeting;
		});
	};

	var pulse = function (story) {
		var pulseClass = "pulse";
		if ((story.isDeadline && story.isAfterNextMeeting) 
			|| story.isNextMeeting) {
			pulseClass = "pulse-milepost";
		}
		var qStory = $("[data-story-id='" + story.id + "']");
		qStory = qStory.find('.story');

		if (qStory.hasClass(pulseClass)) {
			return;
		}

		// Use CSS to flash a different colored background
		// for a moment then fade to whatever we were.
		qStory.addClass(pulseClass);
		$timeout(function () {
			qStory.addClass('color-transition');	
		}, 10);
		
  		$timeout(function () { 
  			qStory.removeClass(pulseClass);
  			$timeout(function () {
  				qStory.removeClass('color-transition');
  			}, 500);
  		}, 25);	
	};
	$scope.pulse = pulse;

	var scrollToAndPulse = function (story) {
		var qStory = $("[data-story-id='" + story.id + "']");
		qStory = qStory.find('.story');
		if (!qStory) {
			return;
		}

		var shouldScroll = true;
		var bodyScrollTop = $('body').prop('scrollTop');		
		if (bodyScrollTop < qStory.offset().top) {
			shouldScroll = false;
		}

		if (shouldScroll) {
			var delay = 500;
			// Give the story time to close before
			// starting the scroll animation.
			$timeout(function () {
				$('body').animate({
					// scrollTopWhenSelected
					scrollTop: qStory.offset().top - 20
				}, delay);

				$timeout(function () {
					pulse(story);
				}, delay + 75);
			}, 100);
		}
		else {
			pulse(story);
		}
	};

	$scope.$watch('data', function (newVal) {
		if (newVal) {
			circle = newVal.circle;
			circleId = newVal.circleId;
			listId = newVal.listId || undefined;

			buildStoryList(newVal.firstStory, newVal.allStories, newVal.delay);
			// Event: See 'storyListBuilt'

			// TODO: Might be cool to remember the highlighted
			// stories across pages
			if (highlightedStories.length === 0) {
				// Let's not highlight any stories by default,
				// for the time being. The odds of a first-story
				// selection being useful are low. About all it
				// gives us is the arrow keys work right away
				// for changing the highlight.
				//
				// var firstStory = stories.getFirst();
				// firstStory.isHighlighted = true;
				// highlightedStories.push(firstStory);
			}
		}
		else {
			circle = undefined;
			circleId = undefined;
			listId = undefined;
			$scope.stories = [];
			$scope.mileposts = [];
		}
	});

	$scope.$on('storyListBuilt', function () {
		$scope.$broadcast('viewportChanged');
		buildMilepostList(storiesList);
		$scope.nextMeeting = findNextMeeting();

		activateDragAndDrop();
	});


	var unhighlightAllStories = function () {
		while (highlightedStories.length > 0) {
			var story = highlightedStories.pop();
			story.isHighlighted = false;
			// TODO: This is a bit fragile ... should
			// wrap the highlight methods soon.
			story.highlightedFrom = 'none';
		}
	}

	var isMouseAboveFirstHighlight = function () {
		if (!$scope.mouse.dragStartPoint || !$scope.mouse.position) {
			return false;
		}

		if ($scope.mouse.dragStartPoint.y > $scope.mouse.position.y) {
			return true;
		}
		return false;
	};

	var highlightStory = function (story, highlightType) {
		if (highlightType === 'single') {
			// Only allow one story to be highlighted.
			unhighlightAllStories();	
		}

		if (isMovingTask) {
			return;
		}

		var highlight = function (storyToHighlight) {
			if (!storyToHighlight) {
				return;
			}
			storyToHighlight.isHighlighted = true;
			storyToHighlight.highlightedFrom = $scope.mouse.direction;
			highlightedStories.push(storyToHighlight);
			$scope.$emit('storyHighlighted', storyToHighlight);
		};

		if (highlightedStories.length === 0) {
			highlight(story);
			return;
		}

		// Account for the mouse leaving and re-entering
		// the list during a drag. Also makes fast drags
		// work, if they're going in one direction
		if (!isMouseAboveFirstHighlight()) {
			var current = highlightedStories[highlightedStories.length-1];

			while (current && current.id !== story.id) {
				current = stories.get(current.nextId);
				highlight(current);
			}
		}
		else {
			var current = highlightedStories[highlightedStories.length-1];

			while (current && current.id !== story.id) {
				current = stories.getPrevious(current, stories.get(current.id));
				highlight(current);
			}
		}
	};


	$scope.$on('storyHighlight', function (e, story, highlightType) {
		highlightStory(story, highlightType);
	});
					

	$scope.$on('storyUnhighlight', function (e, story, direction) {
		if (highlightedStories.length <= 1) {
			return;
		}
		
		var unhighlight = function () {
			var indexToRemove = -1;
			highlightedStories.forEach(function (highlighted, index) {
				if (highlighted.id === story.id) {
					indexToRemove = index;
				}
			});

			// Remove everything after the unhighlighted story.
			// This helps us recover if a mouse-leave event isn't
			// handled in order or something.
			var count = highlightedStories.length-indexToRemove

			if (indexToRemove >= 0) {
				var removedStories = highlightedStories.splice(indexToRemove, count);
				removedStories.forEach(function (removedStory) {
					removedStory.isHighlighted = false;
					removedStory.highlightedFrom = 'none';
				});
			}
		}

		if (isMouseAboveFirstHighlight() && direction === 'down') {
			unhighlight();
		}
		else if (!isMouseAboveFirstHighlight() && direction === 'up') {
			unhighlight();
		}
	});

	// These are used in the story directive. It works
	// because they inherit our scope
	$scope.isStoryMostRecentHighlight = function (story) {
		if (highlightedStories.length === 0) {
			return false;
		}
		else if (highlightedStories[highlightedStories.length-1].id === story.id) {
			return true;
		}
		return false;
	};

	$scope.cutHighlighted = function () {
		cutHighlighted();
	};

	$scope.pasteHighlighted = function ()  {
		pasteHighlighted();
	};

	$scope.mouseLeave = function (story) {
		
	};

	var isShiftDown = function () {
		var is = $scope.keyboard && 
			$scope.keyboard.isShiftDown && 
			!$scope.isClipboardActive;

		return is;
	};

	var isHighlightingUp = function () {
		// Determine the direction of the current highlight.
		// If the most recently highlighted story's next story
		// is highlighted, that means we're moving up.
		if (highlightedStories.length <= 1) {
			return false;
		}

		var lastHighlighted = highlightedStories[highlightedStories.length-1];
		var nextStory = stories.get(lastHighlighted.nextId);
		if (!nextStory) {
			return false;
		}

		return nextStory.isHighlighted;
	};

	// TODO: Refactor this junk
	$scope.$on('keyDownArrow', function (e, event) {
		if (selectedStory || highlightedStories.length === 0) {
			return;
		}
	
		// If the shift key is pressed, add to the selection, 
		// otherwise ... 
		var recentStory;
		if (isShiftDown()) {
			var lastHighlighted = highlightedStories[highlightedStories.length-1];
			var nextStory = stories.get(lastHighlighted.nextId);

			if (!nextStory) {
				return;
			}

			if (nextStory.isHighlighted) {
				// Highlighting up
				var storyToUnhighlight = highlightedStories.pop();
				storyToUnhighlight.isHighlighted = false;

				// Stop the window from the scrolling, and then scroll
				// to the highlighted story
				event.preventDefault();
				var preventOpening = true;
				var delay = 0;
				scrollToStory(storyToUnhighlight.id, preventOpening, delay);
				return;
			}
			else {
				// Highlighting down
				recentStory = highlightedStories[highlightedStories.length-1];
			}
		}
		else {
			// Shift is not down.
			// Move the highlighted story down one visible story
			recentStory = highlightedStories.pop();
			recentStory.isHighlighted = false;
			unhighlightAllStories();
		}

		var nextStory = stories.get(recentStory.nextId);
		//TODO: highlight blocks + labels
		while (nextStory && $scope.shouldHideStory(nextStory)
			|| ($scope.isClipboardActive && nextStory && nextStory.isInClipboard)) {
			nextStory = stories.get(nextStory.nextId);
		}

		if (nextStory) {
			nextStory.isHighlighted = true;
			highlightedStories.push(nextStory);
			$scope.$emit('storyHighlighted', nextStory);

			// Stop the window from the scrolling, and then scroll
			// to the highlighted story
			event.preventDefault();
			var preventOpening = true;
			var delay = 0;
			scrollToStory(recentStory.id, preventOpening, delay);
		}
		else if (isShiftDown()) {
			// Do nothing. We're at the bottom and shift is down.
		}
		else {
			// Revert if we're at the bottom
			recentStory.isHighlighted = true;
			highlightedStories.push(recentStory);
			$scope.$emit('storyHighlighted', recentStory);
		}
	});


	$scope.$on('keyUpArrow', function (e, event) {
		if (selectedStory || highlightedStories.length === 0) {
			return;
		}

		if (isShiftDown()) {
			// TODO: What happens when a label filter is applied to the list?
			var lastHighlighted = highlightedStories[highlightedStories.length-1];
			var previousStory = 
				stories.getPrevious(lastHighlighted, stories.get(lastHighlighted.id));

			if (!previousStory) {
				return;
			}

			if (previousStory.isHighlighted) {
				// Highlighting down
				var storyToUnhighlight = highlightedStories.pop();
				storyToUnhighlight.isHighlighted = false;
			}
			else {
				// Highlighting up
				previousStory.isHighlighted = true;
				highlightedStories.push(previousStory);
				$scope.$emit('storyHighlighted', previousStory);
			}

			event.preventDefault();
			var preventOpening = true;
			var delay = 0;
			var isMovingUp = true;
			scrollToStory(previousStory.id, preventOpening, delay, isMovingUp);
		}
		else {
			// Move the highlighted story up one visible story
			var story = highlightedStories.pop();
			story.isHighlighted = false;
			unhighlightAllStories();

			var previousStory = stories.getPrevious(story, stories.get(story.id));
			while (previousStory && 
				($scope.shouldHideStory(previousStory) || 
					($scope.isClipboardActive && previousStory && previousStory.isInClipboard)
				)
			) {
				previousStory = stories.getPrevious(previousStory, previousStory);
			}

			if (previousStory) {
				previousStory.isHighlighted = true;
				highlightedStories.push(previousStory);
				$scope.$emit('storyHighlighted', previousStory);

				// Stop the window from scrolling, and then scroll
				// to the highlighted story
				event.preventDefault();
				var preventOpening = true;
				var delay = 0;
				var isMovingUp = true;
				scrollToStory(story.id, preventOpening, delay, isMovingUp);
			}
			else {
				// Revert if we're at the top
				story.isHighlighted = true;
				highlightedStories.push(story);
				$scope.$emit('storyHighlighted', story);
			}
		}
	});

	$scope.$on('keyEnter', function (e) {
		if (highlightedStories.length === 0) {
			return 0;
		}
		// Open / select the highlighted story
		var story = highlightedStories[0];

		$scope.$emit('beforeStorySelected', story);
		story.isSelected = true;
		$scope.$emit("storySelected", story);
	});

	$scope.$on('keyEscape', function (e) {
		if (selectedStory) {
			// Close / deselect the story
			// TODO: Revert changes to the story, which needs
			// to happen when 'hide details' is clicked, too.
			selectedStory.isSelected = false;
			$scope.$emit('storyDeselected', selectedStory);			
		}
		else if (!$scope.isClipboardActive) {
			unhighlightAllStories();
		}
		// TODO: Un-cut the things.
	});

	function cutHighlighted() {
		if (clipboardStories.length > 0 || highlightedStories.length === 0) {
			return;
		}

		highlightedStories.forEach(function (story) {
			// TODO: Put in order? Maybe.
			story.isInClipboard = true;
			$scope.isClipboardActive = true;
			clipboardStories.push(story);
		});

		// Only highlight the top-most story
		var highlightedStory;
		if (isHighlightingUp()) { 
			highlightedStory = highlightedStories[highlightedStories.length-1];
		}
		else {
			highlightedStory = highlightedStories[0];
		}

		unhighlightAllStories();
		highlightedStory.isHighlighted = true;
		highlightedStories.push(highlightedStory);
	}

	$scope.$on('keyCut', function (e, event) {
		cutHighlighted();
		event.preventDefault();
	});

	function getStartAndEndOfBlock(storyBlock) {
		var idMap = {};
		var nextMap = {};

		storyBlock.forEach(function (story) {
			idMap[story.id] = story;
			nextMap[story.nextId] = story;
		});

		var start;
		var end;

		storyBlock.forEach(function (story) {
			if (!idMap[story.nextId]) {
				end = story;
			}
			if (!nextMap[story.id]) {
				start = story;
			}
		});

		// If the first clipboard element's next story
		// is also in the clipboard, that means the stories
		// are arranged from top to bottom.
		//
		// If not, they're bottom to top
		// if (map[storyBlock[0].nextId]) {
		// 	start = storyBlock[0];
		// 	end = storyBlock[storyBlock.length-1];
		// }
		// else {
		// 	end = storyBlock[0];
		// 	start = storyBlock[storyBlock.length-1];
		// }

		return {
			start: start,
			end: end
		};
	};

	function pasteHighlighted() {
		if (highlightedStories.length === 0 || clipboardStories.length === 0) {
			return;
		}

		var nextStory = highlightedStories.pop();
		nextStory.isHighlighted = false;

		var block = getStartAndEndOfBlock(clipboardStories);

		moveStoryBlock(block.start,
			stories.get(block.start.id), 
			stories.get(block.end.id),
			stories.get(nextStory.id));

		clipboardStories.forEach(function (story) {
			story.isInClipboard = false;
			highlightedStories.push(story);
			story.isHighlighted = true;
		});
		clipboardStories = [];
		$scope.isClipboardActive = false;
	}

	$scope.$on('keyPaste', function (e, event) {
		pasteHighlighted();
		event.preventDefault();
	});

	$scope.$on('keyCopy', function (e, event) {
		if (highlightedStories.length === 0) {
			return;
		}

		var clipboard = [];
		var block = getStartAndEndOfBlock(highlightedStories);

		var current = stories.get(block.start.id);
		clipboard.push(block.start);

		while (current && current.id !== block.end.id) {
			current = stories.get(current.nextId);
			clipboard.push(stories.get(current.id));
		}

		lib.setCopiedTasks(clipboard);
		clipboard.forEach(function (story) {
			pulse(story);
		});
	});

	$scope.$on('keyDone', function (e, event) {
		$scope.markHighlightedAs('done');
	});

	$scope.$on('keyAssigned', function (e, event) {
		$scope.markHighlightedAs('assigned');
	});

	$scope.$on('keyActive', function (e, event) {
		$scope.markHighlightedAs('active');
	});

	$scope.$on('keyClearStatus', function (e) {
		$scope.markHighlightedAs('');
	});

	$scope.$on('keyTakeOwnership', function (e) {
		var owner = $scope.accountName; 
		$scope.setOwnerForHighlighted(owner);
	});

	$scope.$on('mouseDown', function (e) {

	});

	$scope.$on('mouseUp', function (e) {
		var selectionBox = $('#selectionBox');
		selectionBox.hide();
	});

	$scope.$on('mouseDrag', function (e, event) {
		var selectionBox = $('#selectionBox');

		var startPoint = $scope.mouse.dragStartPoint;
		var endPoint = {
			x: event.pageX,
			y: event.pageY
		};

		var topLeft = {
			left: Math.min(startPoint.x, endPoint.x),
			top: Math.min(startPoint.y, endPoint.y)
		};

		var width = Math.max(startPoint.x, endPoint.x) - Math.min(startPoint.x, endPoint.x);
		var height = Math.max(startPoint.y, endPoint.y) - Math.min(startPoint.y, endPoint.y);

		selectionBox.offset(topLeft);
		selectionBox.width(width);
		selectionBox.height(height);
		// if (isMovingTask) {
		// 	selectionBox.hide();
		// }
		// else {
		// 	selectionBox.show();
		// }
		
	});
	$scope.$on('mouseLeave', function () {
		// If the guest is moving things quickly, sometimes letting go
		// of the mouse outside the window can be a thing, which messes
		// up are shared state -- which is a bad idea anyway, and this
		// is one reason why, but so it goes.
		$scope.mouse.isHighlighting = false;
	})
 
	$scope.markHighlightedAs = function (newStatus) {
		highlightedStories.forEach(function (story) {
			if (story.isDeadline || story.isNextMeeting) {
				return;
			}

			if (story.status !== newStatus) {
				story.status = newStatus;
				$scope.$emit('storyChanged', story);
			}
		});
	};

	$scope.setOwnerForHighlighted = function (owner) {
		highlightedStories.forEach(function (story) {
			if (story.isDeadline || story.isNextMeeting) {
				return;
			}

			// Only emit a changed event if we have to.
			if (story.owner !== owner) {
				story.owner = owner;
				if (!story.status) {
					story.status = "assigned";
				}
				$scope.$emit('storyChanged', story);
			}
			else {
				// We already own it. In that case, mark it
				// as assigned
				if (!story.status) {
					story.status = "assigned";
					$scope.$emit('storyChanged', story);
				}
			}
		});
	};


	$scope.$on('beforeStorySelected', function (e) {
		// Deselect the story that was selected previously
		if (selectedStory) {
			selectedStory.isSelected = false;
		}
	});

	$scope.$on('storySelected', function (e, story) {
		selectedStory = story;
		// TODO: Where should this go, really? 
		if (story.warning) {
			delete story.warning;
		}
		if ($scope.isStoryHighlightedByTeam(story)) {
			story.warning = teamHighlightedStories[story.id] + " is also looking at this task.";
		}


		if (!$scope.isScreenXs) {
			// Bring the focus to the default input box, 
			// which is likely the summary text.
			//
			// We do need this timeout wrapper around focus
			// for this to work, for whatever reason.
			//
			// This behavior is annoying on phones, so don't do
			// that. TODO: Detect tablets too and don't do it.
			$timeout(function () {
				var boxId = "boxForStory" + story.id;
				hacks.focus(boxId);
			});			
		}
	});


	$scope.$on('storyDeselected', function (e, story, event) {
		selectedStory = undefined;
		scrollToAndPulse(story);
	});

	function insertNewStoryIntoViewModel (serverStory) {
		// add the new story to the front of the backlog.
		storiesList.unshift(serverStory);
		if (serverStory.isDeadline) {
			buildMilepostList(storiesList);
		}
	}

	// Called when the entry panel receives a new story.
	$scope.$on('insertNewStory', function (e, newStory, callback) {
		storyBeingInserted = newStory;
		stories.insertFirst(newStory, circleId, listId, function (serverStory) {
			insertNewStoryIntoViewModel(serverStory);
			if (callback) {
				callback(serverStory);
			}
		});
	});

	var isStoryBetween = function (story, start, end) {	
		if (!story) {
			return false;
		}

		if (end.id === story.id) {
			return true;
		}

		// TODO: Assumes a valid block, otherwise it is 
		// infinite loop time
		var current = start;
		while (current.id !== end.id) {
			if (current.id === story.id) {
				return true;
			}

			if (current.nextId === getLastStoryId()) {
				return false;
			}
			current = stories.get(current.nextId)
		}

		return false;
	};

	function moveStoryBlock (uiStartStory, startStory, endStory, nextStory, isLocalOnly) {
		var storyToMove = startStory;

		if (startStory.id === nextStory.id 
			|| startStory.nextId === nextStory.id
			|| endStory.id === nextStory.id
			|| endStory.nextId === nextStory.id
			|| isStoryBetween(nextStory, startStory, endStory)) {
			// Do nothing.
			// console.log('start ' + startStory.id);
			// console.log('start.next ' + startStory.nextId)
			// console.log('end   ' + endStory.id);
			// console.log('next  ' + nextStory.id);
			return;
		}

		// Update data model
		// TODO: Refactor, to share the same code used below
		var preMove = {
			storyBefore: stories.getPrevious(uiStartStory, startStory),
			storyAfter: stories.get(endStory.nextId)
		};

		var postMove = {
			storyBefore: stories.getPrevious(nextStory, nextStory),
			storyAfter: nextStory
		};

		// If the moved story was the first story, the preMove.storyAfter
		// is now the first story (if it exists).
		if (stories.getFirst().id === startStory.id && preMove.storyAfter) {
			stories.setFirst(preMove.storyAfter);
		}

		// We need to update 'nextId' of the following:
		// 1. The story before the moved story, before it was moved.		
		if (preMove.storyBefore) {
			preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
		}

		// 2. ...
		if (postMove.storyBefore) {
			postMove.storyBefore.nextId = startStory.id;
		}
		else {
			stories.setFirst(startStory);	
		}
		
		// 3. ...
		endStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();

		// Update view model
		try { 
			updateViewModelStoryOrder();
		}
		catch (ex) {
			errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
			return;
		}

		// ...
		$timeout(function () {
			pulse(startStory);
		}, 100);

		if (isLocalOnly) {
			return;
		}

		// Update server
		$timeout(function() {
			stories.moveBlock(startStory, endStory, nextStory, function (err, response) {
				if (err) {
					// We failed. Probably because of a data integrity issue
					// on the server that we need to wait out. 
					errors.handle(err.data, err.status);
					return;
				}
				else {
					if (startStory.id === endStory.id) { 
						$scope.$emit('storyMoved', startStory);
					} 
					else {
						$scope.$emit('storyBlockMoved', startStory, endStory);
					}			
				}
			});
		}, 0);
	}

	function moveStory (uiStory, storyToMove, nextStory) {
		moveStoryBlock(uiStory, storyToMove, storyToMove, nextStory);
	}

	$scope.$on('storyMovedToTop', function (e, story) {
		e.stopPropagation();
		e.preventDefault();

		var storyToMove = stories.get(story.id);
		var nextMeeting = findNextMeeting();

		moveStory(story, storyToMove, nextMeeting);
	});

	var removeFromView = function (viewStory, serverStory, shouldAnimate) {

		var nextStory = stories.get(serverStory.nextId);

		if (viewStory.isSelected) {
			viewStory.isSelected = false;
			selectedStory = undefined;
		}

		if (stories.isListBroken()) {
			$scope.$emit('storyListBroken');
			return;
		}

		var previousStory = stories.getPrevious(viewStory, serverStory);
		if (!previousStory) {
			stories.setFirst(nextStory);
		}
		else {
			previousStory.nextId = nextStory ? nextStory.id : getLastStoryId();
		}

		function actuallyRemove() {
			var storyIndex = storiesList.indexOf(viewStory);
			storiesList.splice(storyIndex, 1);
			stories.remove(viewStory.id);

			// Update the view model
			if (viewStory.isDeadline) {
				buildMilepostList(storiesList);
			}
		}

		if (shouldAnimate) {
			getStoryElement(viewStory.id).fadeOut(actuallyRemove);
		}
		else {
			actuallyRemove();
		}
		

		// TODO: Do we need this for 'remove'?
		// $timeout(makeStoriesDraggable, 0);
	};

	$scope.$on('storyArchived', function (e, story) {
		// Checklists can't be archived for now.
		if (isChecklist) {
			return;
		}

		var storyToArchive = stories.get(story.id);
		removeFromView(story, storyToArchive);
		
		// Facades give the impression that the story
		// has gone into the archives.
		if (isFacade) {
			return;
		}

		$http.put('/data/story/archive', storyToArchive)
		.success(function (data) {
			// nbd.
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	});

	$scope.$on('storyRemoved', function (e, story) {
		// TODO: Sometimes all the stories after the
		// removed story are no longer shown, but the
		// data is fine on the server so a refresh 
		// takes care of everything. Look into this data
		// display issue.
		var storyToRemove = stories.get(story.id);
		removeFromView(story, storyToRemove);
		
		if (isFacade) {
			return;
		}

		$http.put('/data/story/remove', storyToRemove)
		.success(function (data) {
			// nbd.
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	});

	$scope.$on('storySaved', function (e, story) {
		var storyToSave = stories.get(story.id);
		
		// Parse labels out of story.summary
		story.labels = [];
		var words = story.summary.split(lib.consts.LabelRegex);

		words.forEach(function (word) {
			word = word.trim();
			if (word.indexOf('#') === 0) {
				story.labels.push(word.slice(1));
			}
		});

		// TODO: We can probably just have this on the 
		// server side, but it's nice to have clean
		// traffic I guess.
		storyToSave.summary = story.summary;
		storyToSave.owner = story.owner;
		storyToSave.status = story.status;
		storyToSave.description = story.description;
		storyToSave.labels = story.labels;

		storyToSave.newComment = story.newComment;
		
		stories.set(story.id, storyToSave, function (savedStory) {
			story.newComment = undefined;
			story.comments = savedStory.comments;
			story.isOwnerNotified = savedStory.isOwnerNotified;
		});

		if (storyToSave.isDeadline || storyToSave.isNextMeeting) {
			$scope.mileposts.forEach(function (milepost) {
				if (storyToSave.id === milepost.id) {
					milepost.summary = storyToSave.summary;
				}
			});
		}
	});

	$scope.$on('storyCommentSaved', function (e, story) {
		stories.saveComment(story, story.newComment, function (savedStory) {
			story.newComment = undefined;
			story.comments = savedStory.comments;
		});
	});

	$scope.$on('storyChanged', function (e, story) {
		if (!story.isSelected) {
			pulse(story);	
		}
		// TODO: Do we need this serverStory runaround?
		var serverStory = stories.get(story.id);
		stories.save(serverStory);
	});

	$scope.$on('ioStory', function (e, payload) {
		var story = payload.data;
		var viewModel = stories.get(story.id);
		viewModel.status = story.status;


		if (story.newComment) {
			var commentFound = false;
			// Add this new comment to the story's comment list
			// if we don't already have it.
			for (index in viewModel.comments) {
				var comment = viewModel.comments[index];
				if (comment.timestamp === story.newComment.timestamp
					&& comment.createdBy.id === story.newComment.createdBy.id) {
					commentFound = true;
				}
			}
			if (!commentFound) {
				viewModel.comments.push(story.newComment);
			}
		}

		if (!viewModel.isSelected) {
			viewModel.labels = story.labels;
			viewModel.summary = story.summary;
			viewModel.description = story.description;
			viewModel.owner = story.owner;

			pulse(viewModel);
		}
		else if (payload.user !== $scope.accountName) {
			viewModel.warning = payload.user + " has just edited this task."
			pulse(viewModel);
		}
	});

	$scope.$on('ioMoveBlock', function (e, payload) {
		var startStory = stories.get(payload.data.startStoryId);
		var endStory = stories.get(payload.data.endStoryId);
		var nextId = payload.data.newNextId;

		var nextStory = stories.get(nextId);

		var isLocalOnly = true;
		if (startStory && endStory && nextStory) {
			moveStoryBlock(startStory, startStory, endStory, nextStory, isLocalOnly);
		}
	});


	$scope.$on('ioStoryAdded', function (e, payload) {
		var story = payload.data;

		// TODO: Make a more robust way of determining
		// if we're receiving an echo of our own insertion.
		if (stories.get(story.id) || 
			(storyBeingInserted && story.summary === storyBeingInserted.summary)) {
			return;
		}

		stories.local.add(story);
		if (story.isFirstStory) {
			stories.setFirst(story);
		}
		insertNewStoryIntoViewModel(story);
		$timeout(function () {
			pulse(story);
		}, 100);
		
		// TODO: Check list integrity. If bad, get
		// the list again from the server.
	});

	$scope.$on('ioStoryRemoved', function (e, payload) {
		var story = payload.data;
		if (!stories.get(story.id)) {
			return;
		}

		var storyToRemove = stories.get(story.id);
		var shouldAnimate = true;
		removeFromView(storyToRemove, storyToRemove, shouldAnimate);
	});

	$scope.$on('ioStoryHighlighted', function (e, payload) {
		var storyId = payload.data.storyId;
		var story = stories.get(storyId);
		if (story) { 
			// Clear old data
			for (index in teamHighlightedStories) {
				if (teamHighlightedStories[index] === payload.user) {
					delete teamHighlightedStories[index];
				}
			}

			// Save new data
			if (story.isHighlighted && payload.user === $scope.accountName) {
				// Do nothing.
			}
			else {
				teamHighlightedStories[payload.user] = story;
				if (teamHighlightedStories[story.id] !== $scope.accountName) {
					teamHighlightedStories[story.id] = payload.user;
				}
			}
		}
	});

	$scope.isStoryHighlightedByTeam = function (story) {
		if (teamHighlightedStories[story.id]) {
			return true;
		}
		return false;
	};

	$scope.$on('storyNotify', function (e, story, event) {
		if (!story.isNotifying && !story.isOwnerNotified) {
			story.isNotifying = true;

			var notificationSuccessful = function () {
				story.isNotifying = undefined;
				story.isOwnerNotified = true;
			};

			event.stopPropagation();

			if (isFacade) {
				var oneSecond = 1000;
				$timeout(notificationSuccessful, oneSecond);
				return;
			}

			$http.post('/data/story/notify/new', story)
			.success(function (data) {
				notificationSuccessful();
			})
			.error (function (data, status) {
				story.isNotifying = undefined;
				errors.handle(data, status);
			});
		}		
	});


	function scrollToStory (storyId, keepClosed, delay, isMovingUp) {
		if (typeof delay === 'undefined') {
			delay = 250;
		}

		storiesList.forEach(function (story, index) {
			if (story.id === storyId) {
				var scrollNow = function () {
					var elementId = "#story-" + index;
					var topMargin = 75;
					if (isMovingUp) {
						topMargin *= 2.5;
					}
					if (delay > 0) {
						// Use jQuery to smooth-scroll to where we
						// want to be.
						$('html, body').animate({
							scrollTop: $(elementId).offset().top - topMargin
						}, delay);
					}
					else {
						$('html, body').scrollTop($(elementId).offset().top - topMargin);
					}
	
					if (!keepClosed) {
						story.isSelected = true;
						selectedStory = story;
					}
				};

				// HACK: Wait for the ng-repeat element to
				// populate itself. 250 milliseconds should
				// be long enough for our needs.
				$timeout(scrollNow, delay);

				// If we ever want to do things the Angular way, 
				// it's closer to this:
				// 	$anchorScroll();
				// 	$location.hash("story-" + index);
			}
		});
	};


	$scope.$on('scrollToStory', function (e, storyId) {
		// Special stories
		if (storyId === "next-meeting") {
			storiesList.forEach(function (story) {
				if (story.isNextMeeting) {
					storyId = story.id;
				}
			});
		}

		// TODO: Implications of listId
		$http.get('/data/story/' + storyId)
		.success(function (story) {
			if (story.projectId !== circleId) {
				// switch the active circle
				var circleFacade = {
					_id: story.projectId
				};

				$scope.$emit('setActiveCircle', circleFacade, false, function () {
					$location.path("/stories/" + storyId);
					$route.reload();
				});				
			}
			else {
				highlightStory(stories.get(storyId), 'single');
				scrollToStory(storyId);
			}
		})
		.error(function (data, status) {
			errors.log(data, status);
		});
	});

	// TODO: It would be nice if we didn't have to 
	// wait a magic amount of time, and could react
	// to some event.
	$scope.$on('mindsetChanged', function (e, mindset) {
		$timeout(function () {
			makeStoriesDraggable();
		}, 500);
	});

	var updateUI = function () {
		// HACK: So, yeah, we'll let future self
		// worry about how to do this well ...
		$(function () {
			if (circle) {
				var colors = circle.colors;
				if (colors && colors.mileposts) {				
					var mileposts = $('.deadline');
					if (colors.mileposts.foreground) {
						mileposts.css('color', colors.mileposts.foreground);
						mileposts.addClass('has-custom-color');
					}
					if (colors.mileposts.background) {
						mileposts.css('backgroundColor', colors.mileposts.background);
						mileposts.addClass('has-custom-color');
					}
				}
			}
		});
	};

	// Tmp for development:
	// selectedLabels.push("label");
	$scope.$on('labelSelected', function (e, text) {
		if (selectedLabels.indexOf(text) < 0) {
			selectedLabels.push(text);	
		}
	});

	$scope.$on('ownerSelected', function (e, owner) {
		if (owner) {
			selectedOwner = owner;
			$scope.selectedOwner = selectedOwner;
		}
	});

	$scope.clearFilter = function () {
		selectedLabels = [];
		$scope.selectedLabels = selectedLabels;
		$scope.deselectOwner();
	};

	$scope.deselectLabel = function (text) {
		var labelIndex = selectedLabels.indexOf(text);
		if (labelIndex >= 0) {
			selectedLabels.splice(labelIndex, 1);	
		}
	};

	$scope.deselectOwner = function () {
		selectedOwner = undefined;
		$scope.selectedOwner = selectedOwner;
		$scope.$emit('ownerSelected', selectedOwner);
	};

	$scope.shouldHideStory = function (story) {
		var shouldHide = false;

		// Always show deadlines and next meeting, 
		// so that people have context for the tasks
		if (story.isDeadline || story.isNextMeeting) {
			return false;
		}

		// Search
		if (searchEntry && searchEntry.length > 0) {
			for (index in searchEntry) {
				if (story.summary.toLowerCase().indexOf(searchEntry[index]) < 0) {
					if (story.owner && story.owner.toLowerCase().indexOf(searchEntry[index]) >= 0) {
						// Stay cool.
					}
					else {
						shouldHide = true;
					}
				}
			}
		}

		// Labels
		if (selectedLabels.length > 0) {

			if (!story.labels || story.labels.length <= 0) {
				shouldHide = true;
			}
			else {
				for (var selectedLabelIndex in selectedLabels) {
					var selectedLabel = selectedLabels[selectedLabelIndex];
					if (story.labels.indexOf(selectedLabel) < 0) {
						shouldHide = true;
						break;
					}
				}	
			}
		}

		// Owner filter
		if (selectedOwner) {
			if (story.owner !== selectedOwner) {
				shouldHide = true;
			}
		}
		
		return shouldHide;
	};

	$scope.isMindset = function (m) {
		if ($scope.mindset) {
			return $scope.mindset === m;
		}
		return lib.mindset.is(m);
	};

	$scope.getMindsetClass = function () {
		if ($scope.mindset) {
			return "mindset-" + $scope.mindset;
		}
		return "mindset-" + lib.mindset.get();
	};

	function updateViewModelStoryOrder() {
		// The YUI drag-and-drop stuff manipulates the DOM, 
		// but doesn't touch our view-model, so we need to 
		// update our stories array to reflect the new order
		//  of things.
		var applyNextMeeting = function (stories) {
			var isAfterNextMeeting = false;
			for (var key in stories) {
				if (isAfterNextMeeting) {
					stories[key].isAfterNextMeeting = true;
				}
				else if (stories[key].isNextMeeting) {				
					isAfterNextMeeting = true;
				}
				else {
					stories[key].isAfterNextMeeting = false;
				}
			}
			return stories;
		};

		var storiesInNewOrder = [];

		if (stories.isListBroken()) {
			$scope.$emit('storyListBroken');
			return;
		}

		var firstStory = stories.getFirst();
		var currentStory = firstStory;
		
		while (currentStory) {
			storiesInNewOrder.push(currentStory);
			currentStory = stories.get(currentStory.nextId);
		}

		if (storiesInNewOrder.length === storiesList.length) {
			// Update isAfterNextMeeting for all stories
			storiesInNewOrder = applyNextMeeting(storiesInNewOrder);

			// Update our view with the proper story order
			//
			// TODO: We really only need to update the range of
			// stories affected, not all of them, but that can 
			// be a performance optimization later.
			for (var key in storiesInNewOrder) {
				storiesList[key] = stories.get(storiesInNewOrder[key].id);
			}

			buildMilepostList(storiesList);
		}
		else {
			console.log("NEW:     " + storiesInNewOrder.length);
			console.log("CURRENT: " + storiesList.length);
			throw new Error("New order count mismatch");
			// errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
		}
	};


	//-------------------------------------------------------
	// Drag and drop
	//-------------------------------------------------------
	var thisY = undefined;
	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;
	var preMoveBlockSize = undefined;
	var siblingSelector = '.storyWrapper';

	var getLastStoryId = function () {
		return "last-" + (listId || circleId);
	};

	var getStoryFacadeFromElement = function (el) {
		return {
			id: el.attr(idAttr)
		};
	};

	var getStoryBefore = function (el, start, end) {
		var previousElement = el.prev(siblingSelector);

		while (previousElement !== null && previousElement.attr(idAttr)) { 
			var storyBefore = getStoryFacadeFromElement(previousElement);

			if (isStoryBetween(storyBefore, start, end)) {
				previousElement = previousElement.prev(siblingSelector);
			}
			else {
				return storyBefore;
			}
		}

		return {
			id: "first"
		};
	};

	var getStoryAfter = function (el) {
		var nextElement = $(el).next(siblingSelector);
		if (nextElement !== null && nextElement.attr(idAttr)) {
			return getStoryFacadeFromElement(el.next(siblingSelector));
		}
		else {
			return {
				id: getLastStoryId()
			};
		}
	};


	var startMove = function (ui) {
		var block = getStartAndEndOfBlock(highlightedStories);
		preMoveBlockSize = highlightedStories.length;

		// It's useful to know the state of things before the move.
		//preMoveStoryBefore = getStoryBefore(preMoveStoryElement);
		preMoveStoryBefore = 
			stories.getPrevious(block.start, stories.get(block.start.id));
		// TODO: This does NOT work. However, we work around it below.
		// preMoveStoryAfter = getStoryAfter(ui.item);

		if (!preMoveStoryBefore) {
			preMoveStoryBefore = {
				id: "first"
			};
		}

		highlightedStories.forEach(function (story) { 
			var story = stories.get(story.id);
			story.isMoving = true; // TODO: Remove this.
			story.isBeingDragged = true;
		});

		// getStoryAfter(), above, doesn't seem to work 
		// how we want at this point in time.
		var nextStory = stories.get(block.end.nextId);
		if (nextStory) {
			preMoveStoryAfter = { id: nextStory.id };
		}
		else {
			preMoveStoryAfter = { id: getLastStoryId() };
		}

		// TODO: Do we have to do these with the new jQuery sortable?
		//Set some styles here
		// drag.get('node').addClass('placeholder-story'); // applied to the storyWrapper

		// drag.get('dragNode').addClass('dragging-row'); // applied to the storyWrapper
		// drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
		// drag.get('dragNode').one('.story').addClass('dragging-story');
	};

	var hackRefresh = function () {
		var hackCircleId = circleId;
		var hackListId = listId;
		var hackFirstStory = stories.getFirst();
		var hackAllStories = stories.all();

		$scope.data = null;
		$scope.$apply();
		$scope.data = {
			circleId: hackCircleId,
			listId: hackListId,
			firstStory: hackFirstStory,
			allStories: hackAllStories,
			delay: 0
		};
		$scope.$apply(function () {
			$timeout(function () {
				makeStoriesDraggable();
			}, 500);	
		});
	};

	var storyNodeMoved = function (ui, item, start, end) {
		var story = getStoryFacadeFromElement(item);
		var storyBefore = getStoryBefore(item, start, end);
		var storyAfter = getStoryAfter(item);

		var startStory = stories.get(start.id);
		var endStory = stories.get(end.id);

		var preMove = {
			storyBefore: stories.get(preMoveStoryBefore.id),
			storyAfter: stories.get(preMoveStoryAfter.id)
		};

		// HACK: So, get the 'storyAfter' from the
		// model, and not the DOM. This is so that
		// we work in roadmap mode.
		//
		// There might be some unintended consequences
		// from this, so be aware.
		var getStoryAfterFromModel = function () {
			var prev = stories.get(storyBefore.id);
			if (!prev) {
				return stories.getFirst();
			}
			return stories.get(prev.nextId);
		};

		var postMove = {
			storyBefore: stories.get(storyBefore.id),
			// See HACK note, above.
			// storyAfter: stories.get(storyAfter.id)
			storyAfter: getStoryAfterFromModel()
		};

		// console.log("PRE MOVE");
		// console.log(preMove);

		// console.log("POST MOVE");
		// console.log(postMove);

		if (preMove.storyBefore === postMove.storyBefore
		|| preMove.storyAfter === postMove.storyAfter
		|| isStoryBetween(postMove.storyBefore, startStory, endStory)
		|| isStoryBetween(postMove.storyAfter, startStory, endStory)) {
			// We didn't actually move. Do nothing.
			highlightedStories.forEach(function (movedStory) {
				movedStory.isBeingDragged = false;
			});

			if ($scope.isMindset('roadmap')) {
				// HACK: I can't figure out how to deal with this situation
				// right now, and I think rebinding the page is better
				// than leaving an artifact
				hackRefresh();
			}

			return true;
		}

		var updateModelStoryOrder = function () {
			// If the moved story was the first story, the preMove.storyAfter
			// is now the first story (if it exists).
			if (stories.getFirst().id === start.id && preMove.storyAfter) {
				stories.setFirst(preMove.storyAfter);
			}

			// We need to update 'nextId' of the following:
			// 1. The story before the moved story, before it was moved.		
			if (preMove.storyBefore) {
				preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
			}
			
			// 2. The story before the moved story, after it was moved.
			if (postMove.storyBefore) {
				postMove.storyBefore.nextId = start.id;
			}
			else {
				// No need to set the "nextId" on the "storyBefore," because 
				// there isn't one. Instead, we know that the moved story
				// is now the first story.
				stories.setFirst(startStory);
			}

			// 3. The last story that was moved, unless it's now the last story.
			endStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();	
		}();
		
		
		try {
			updateViewModelStoryOrder();
		}
		catch (ex) {
			console.log("INTEGRITY ISSUE IN CLIENT");
			console.log("PRE MOVE");
			console.log('Before: ' + preMove.storyBefore.summary);
			console.log('After:  ' + preMove.storyAfter.summary);

			console.log("POST MOVE");
			console.log('Before: ' + postMove.storyBefore.summary);
			console.log('After:  ' + postMove.storyAfter.summary);

			console.log("BLOCK:");
			console.log("Start: " + startStory.summary);
			console.log("End: " + endStory.summary);

			errors.handle("Something unknown happened with the move. Need to refresh page.", "client");

			highlightedStories.forEach(function (movedStory) {
				movedStory.isBeingDragged = false;
			});
			return false;
		}

		// Without this $timeout, there is a slight delay
		// in facade mode.
		$timeout(function() {
			stories.moveBlock(startStory, endStory, postMove.storyAfter, function (err, response) {
				if (err) {
					// We failed. Probably because of a data integrity issue
					// on the server that we need to wait out. 
					errors.handle(err.data, err.status);
					return;
				}
				else {
					if (startStory.id === endStory.id) { 
						$scope.$emit('storyMoved', startStory);
					} 
					else {
						$scope.$emit('storyBlockMoved', startStory, endStory);
					}	
				}
			});
		}, 0);

		highlightedStories.forEach(function (movedStory) {
			movedStory.isBeingDragged = false;
		});

		return true;
	};

	var attachToDragEvents = function (Y) {
		// No longer needed with .grippy
		//
		// If a story is selected, (the details panel is open),
		// then don't allow drag events to happen.
		// Y.DD.DDM.before('drag:mouseDown', function (e) {
		// 	var drag = e.target;
		// 	var preMoveStoryNode = drag.get('node');
		// 	if (preMoveStoryNode) {
		// 		var storyId = getStoryFacadeFromNode(preMoveStoryNode).id;		    	
		// 		var story = stories.get(storyId);

		// 		if (story.isSelected) {
		// 			e.stopPropagation();
		// 			e.preventDefault();
		// 		}
		// 	}
		// });

		// Show a semi-transparent version of the story selected.
		Y.DD.DDM.on('drag:start', function(e) {
			//Get our drag object
			var drag = e.target;
	
			// It's useful to know the state of things before the move.
			var preMoveStoryNode = drag.get('node');
			preMoveStoryBefore = getStoryBefore(preMoveStoryNode);
			preMoveStoryAfter = getStoryAfter(preMoveStoryNode);

			var storyId = getStoryFacadeFromNode(preMoveStoryNode).id;		    	
			var story = stories.get(storyId);
			story.isMoving = true;

			//Set some styles here
			drag.get('node').addClass('placeholder-story'); // applied to the storyWrapper

			drag.get('dragNode').addClass('dragging-row'); // applied to the storyWrapper
			drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
			drag.get('dragNode').one('.story').addClass('dragging-story');
		});

		// Revert styles on drag end
		Y.DD.DDM.on('drag:end', function(e) {
			var drag = e.target;
			var n = drag.get('node');

			storyNodeMoved(n);

			//Put our styles back
			drag.get('node').removeClass('placeholder-story');

			// HACK: The end of a drag fires a click event
			// on touch devices, and I can't figure out how
			// to stop it. So, in select(story) we don't
			// do anything when isDragging is true.
			$scope.$broadcast('spIsDragging', true);
			$timeout(function () {
				$scope.$broadcast('spIsDragging', false);
			}, 500);
		});


		// jQuery UI takes care of this.
		//
		// Store stuff while we're dragging
		// var lastY = 0;
		// Y.DD.DDM.on('drag:drag', function(e) {
		// 	//Get the last y point
		// 	var y = e.target.lastXY[1];
		// 	//is it greater than the lastY var?
		// 	if (y < lastY) {
		// 		//We are going up
		// 		goingUp = true;
		// 	} else {
		// 		//We are going down.
		// 		goingUp = false;
		// 	}
		// 	//Cache for next check
		// 	lastY = y;
		// });

		// jQuery UI takes care of this.
		//
		// Y.DD.DDM.on('drop:over', function(e) {
		// 	//Get a reference to our drag and drop nodes
		// 	var drag = e.drag.get('node'),
		// 		drop = e.drop.get('node');
			
		// 	//Are we dropping on a div node?
		// 	if (drop.get('tagName').toLowerCase() === 'div') {
		// 		//Are we not going up?
		// 		if (!goingUp) {
		// 			drop = drop.next();
		// 		}
				
		// 		// HACK: We're probably doing something wrong, but
		// 		// in the mean time let's try this.
		// 		try {
		// 			e.drop.get('node').get('parentNode').insertBefore(drag, drop);
		// 		}
		// 		catch (e) {
		// 			handleHierarchyRequestErr(e);
		// 		}
		// 		e.drop.sizeShim();
		// 	}
		// });

		// jQuery UI takes care of this.
		//
		// Y.DD.DDM.on('drag:drophit', function(e) {
		// 	var drop = e.drop.get('node'),
		// 		drag = e.drag.get('node');

		// 	//if we are not on an div, we must have been dropped on ...
		// 	// ... well, not sure this part of the demo applies to our use case.
		// 	if (drop.get('tagName').toLowerCase() !== 'div') {
		// 		if (!drop.contains(drag)) {
		// 			drop.appendChild(drag);
		// 		}
		// 	}
		// });
	}

	var getStoryElement = function (id) {
		return $("[data-story-id='" + id + "']");
	};

	var checkStoryListDom = function () {
		var current = stories.getFirst();
		var element; 
		while (current && current.nextId !== getLastStoryId()) {
			console.log("...");
			element = getStoryElement(current.id);
			nextElement = element.next(siblingSelector);
			
			next = stories.get(current.nextId);

			if (nextElement.attr('data-story-id') !== next.id) {
				console.log("DOM INTEGRITY BLAH");
				return;
			}

			current = next;
		}

		console.log("DONE");
	};

	$scope.checkIntegrity = checkStoryListDom;

	var ensureDomIntegrity = function (ui) {
		// This can happen when ui.item is not at the top of
		// the block. 
		var facade = getStoryFacadeFromElement(ui.item);
		var story = stories.get(facade.id);
		var next  = stories.get(story.nextId);

		// Check to make sure the next item in the DOM
		// matches the model.
		var domNext = ui.item.next(siblingSelector);
		// TODO: Sometimes the above lies.

		if (domNext && domNext.attr('data-story-id')) {
			if (next) {
				var after = getStoryElement(next.id);
				ui.item.insertBefore(after);
				console.log("INSERT BEFORE")
			}
			else {
				console.log("Should never get here. :(");
			}
		}
		else {
			// Need to do this if we're at the bottom of the list
			var prev = stories.getPrevious(story, story);
			if (prev) {
				var before = getStoryElement(prev.id);
				ui.item.insertAfter(before);
				console.log("INSERT AFTER")
			}
		}

		//////////////////////////////////////////////////////////
		$timeout(checkStoryListDom, 200);
	};


	var orderBlockInDom = function (ui, block) {
		// The way we're using jQuery UI is pretty fragile, and
		// things will mess up if the drop target is not in the 
		// list.
		//
		// Recover from this situation.
		// console.log("Ordering block ...");
		var startElement = getStoryElement(block.start.id);
		var nextElement;
		var element;

		var current = stories.getPrevious(block.start, stories.get(block.start.id));

		while (current && current.id !== block.end.id) {
			// console.log(current.summary);
			element = getStoryElement(current.id);
			nextElement = getStoryElement(current.nextId);
			if (nextElement) {
				nextElement.insertAfter(element);
			}
			current = stories.get(current.nextId);
		}
	};


	var newDraggable = function () {
		var multidragDataLabel = 'multidrag';
		var selector = '.highlightedWrapper';

		$('#sortableList').sortable({
			handle: ".grippy",
			placeholder: "dragging-row",
			forcePlaceholderSize: true,
			opacity: 0.75,
			tolerance: "pointer",
			scrollSensitivity: 25,
			axis: $scope.isMindset('roadmap') ? false : "y",
			helper: function (event, item) {
				var highlighted = item.parent().children(selector).clone();

				// Hide highlighted items from the view
				item.siblings(selector).hide();

				var emptyElement = $("<div/>");
				emptyElement.addClass("dragHelper");
				return emptyElement.append(highlighted);
			},
			deactivate: function (event, ui) {
				// ui.item.removeClass('dragging');
				ui.item.removeClass('moving');

				var block = getStartAndEndOfBlock(highlightedStories);

				if (highlightedStories.length !== preMoveBlockSize) {
					// So, this can be a thing. For now, just hiccup,
					// don't do any moves, and hope that peace finds us.
					console.log("BLOCK SIZES DIFFERENT");
					hackRefresh();

					$(selector).show();
					isMovingTask = false;
					//$scope.mouse.lastMouseDownStory = undefined;
					return;
				}

				var success = storyNodeMoved(ui, ui.item, block.start, block.end);
				// At this point, the server, model and view model
				// are correct, but it is possible that the DOM is 
				// out of order.
				// ensureDomIntegrity(ui);
				if (success && !$scope.isMindset('roadmap')) {
					orderBlockInDom(ui, block);
				}

				// And, we're done. Show our work.
				$(selector).show();
				isMovingTask = false;
				//$scope.mouse.lastMouseDownStory = undefined;
			},
			start: function (event, ui) {
				// The drop shadow slows down the phones a bit
				// ui.item.addClass('dragging');
				ui.item.addClass('moving');
				isMovingTask = true;
				startMove(ui);

				$('.dragging-row').height(highlightedStories.length * 50);
			}
		});

		var mileposts = $('#mileposts');
		if (mileposts.length) {
			mileposts.sortable({
				// This is only a drop target. Tasks
				// cannot be moved.
				cancel: ".storyWrapper",
			});
			$("#sortableList").sortable("option", "connectWith", "#mileposts");	
		}
	};

	var makeStoriesDraggableCore = function(Y) {
		if (!Y) {
			return;
		}
		// Allow stories to be dragged
		// TODO: We should probably make a method for making
		// a specific item draggable, in the case of adding
		// a new item to the backlog.
		var storyElements = Y.Node.all('.storyWrapper');
		var newStoryElementId = "new-story";
		storyElements.each(function (v, k) {
			var nodeId = v.get("id");
			if (nodeId === newStoryElementId) {
				// Do nothing.
				return;
			}

			// Only add draggable stuff once
			var draggableClassName = "cb-draggable";
			if (!v.hasClass(draggableClassName)) {
				v.addClass(draggableClassName);
				var dd = new Y.DD.Drag({
					node: v,
					target: {
						padding: '0 0 0 20'
					}
				}).plug(Y.Plugin.DDProxy, {
					// need this to keep things in a list 
					// (vs leaving the element where the cursor is let go)
					moveOnEnd: false
				}).addHandle('.grippy');
			}
		});
	};

	$scope.$on('makeStoriesDraggable', function (e) {
		makeStoriesDraggable();
	});

	var makeStoriesDraggable = function () {
		// makeStoriesDraggableCore(thisY);
		newDraggable();
		updateUI();
	};

	var activateDragAndDrop = function () {
		// Even though we're waiting for viewContentLoaded, 
		// I guess we need to yield to whatever else is happening.
		$timeout(function () {
			makeStoriesDraggable();

			// Reference: http://yuilibrary.com/yui/docs/dd/list-drag.html
			// var gesturesIfTouch = Modernizr.touch ? 'dd-gestures' : 'dd-drop';
			// YUI({}).use('dd-proxy', 'dd-drop', gesturesIfTouch, function (Y) {
			// 	// keep a local instance of Y around for adding draggable
			// 	// objects in the future.
			// 	thisY = Y;
			// 	makeStoriesDraggableCore(thisY);
			// 	attachToDragEvents(thisY);
			// });
		}, 0);
	};


	$scope.$watch('isFacade', function (newVal) {
		isFacade = newVal;
		stories.setFacade(isFacade);
	});

	$scope.$on('cbSearchEntry', function (e, val) {
		if (!val) {
			searchEntry = undefined;
		}
		else {
			val = val.toLowerCase();
			// searchEntry = val.split(" ");
			// Get phrases surrounded by quotes: 
			// http://stackoverflow.com/questions/16261635/javascript-split-string-by-space-but-ignore-space-in-quotes-notice-not-to-spli
			searchEntry = val.match(/(?:[^\s"]+|"[^"]*")+/g);
			// Remove quotes
			for (index in searchEntry) {
				var token = searchEntry[index];

				if (token.length >= 2 &&
					token.charAt(0) === '"' && 
					token.charAt(token.length-1) === '"') {
					searchEntry[index] = token.substring(1, token.length - 1);
				}
			}
		}
	});

	// TODO: Is this an ok way to configure the story list behavior?
	// A cooler way would be with inheritance, perhaps.
	$scope.$watch('isChecklist', function (newVal) {
		isChecklist = newVal;
	});

	$scope.test = function () {
		hacks.runAddTest(stories, circleId);
	};

	$scope._test = function() {
		return {
			firstStory: stories.getFirst(),
			storiesTable: stories
		}
	};
}
StoryListCtrl.$inject = ['$scope', '$timeout', '$http', '$location', '$route', '$document', '$interval', 'lib', 'hacks', 'errors'];