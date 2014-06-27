function StoryListCtrl($scope, $timeout, $http, $location, $route, hacks, errors) {

	var circleId = undefined;
	var selectedStory = undefined;
	var storiesList = [];
	var stories = CircleBlvd.Services.stories($http);
	var isFacade = false;

	// HACK: Until we can figure out how to stop this properly,
	// reload the page when this happens.
	var handleHierarchyRequestErr = function (e) {
		errors.log("Hierarchy request error. Reloading page.");
		$route.reload();
	};

	var buildStoryList = function (firstStory, serverStories) {
		storiesList = [];

		stories.init(serverStories);
		stories.setFirst(stories.get(firstStory.id));
		stories.get(firstStory.id).isFirstAtLoad = true;

		if (stories.isListBroken()) {
			$scope.$emit('storyListBroken');
			return;
		}

		// TODO: If we don't have a first story, relax.
		var currentStory = stories.getFirst();
		var isAfterNextMeeting = false;

		while (currentStory) {
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
		}


		$scope.stories = storiesList;
		
		// For designing
		// $scope.select(stories.getFirst());
	};

	var pulse = function (story) {
		var qStory = $("[data-story-id='" + story.id + "']");
		qStory = qStory.find('.story');

		if (qStory.hasClass('pulse')) {
			return;
		}

		// Use CSS to flash a different colored background
		// for a moment then fade to whatever we were.
		qStory.addClass('pulse');
		$timeout(function () {
			qStory.addClass('color-transition');	
		}, 10);
		
  		$timeout(function () { 
  			qStory.removeClass('pulse');
  			$timeout(function () {
  				qStory.removeClass('color-transition');
  			}, 500);
  		}, 25);	
	};

	$scope.$watch('data', function (newVal) {
		if (newVal) {
			circleId = newVal.circleId;
			buildStoryList(newVal.firstStory, newVal.allStories);
		}
		else {
			circleId = undefined;
			$scope.stories = [];
		}
	});

	$scope.$on('beforeStorySelected', function (e) {
		// Deselect the story that was selected previously
		if (selectedStory) {
			selectedStory.isSelected = false;
		}
	});

	$scope.$on('storySelected', function (e, story) {
		selectedStory = story;

		// Bring the focus to the default input box, 
		// which is likely the summary text.
		//
		// We do need this timeout wrapper around focus
		// for this to work, for whatever reason.
		$timeout(function () {
			var boxId = "boxForStory" + story.id;
			hacks.focus(boxId);
		});
	});


	$scope.$on('storyDeselected', function (e, story, event) {
		selectedStory = undefined;
		pulse(story);
	});

	$scope.$on('insertNewStory', function (e, newStory, callback) {
		stories.insertFirst(newStory, circleId, function (serverStory) {
			// add the new story to the front of the backlog.
			storiesList.unshift(serverStory);
			if (callback) {
				callback(serverStory);
			}
		});
	});

	var removeFromView = function (viewStory, serverStory) {

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

		var storyIndex = storiesList.indexOf(viewStory);
		storiesList.splice(storyIndex, 1);
		stories.remove(viewStory.id);

		// TODO: Do we need this for 'remove'?
		// $timeout(makeStoriesDraggable, 0);
	};

	$scope.$on('storyArchived', function (e, story) {
		var storyToArchive = stories.get(story.id);
		removeFromView(story, storyToArchive);
		
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
		
		// TODO: We can probably just have this on the 
		// server side, but it's nice to have clean
		// traffic I guess.
		storyToSave.summary = story.summary;
		storyToSave.owner = story.owner;
		storyToSave.status = story.status;
		storyToSave.description = story.description;

		storyToSave.newComment = story.newComment;
		
		stories.set(story.id, storyToSave, function (savedStory) {
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

	$scope.$on('scrollToStory', function (e, storyId) {
		// Special stories
		if (storyId === "next-meeting") {
			storiesList.forEach(function (story) {
				if (story.isNextMeeting) {
					storyId = story.id;
				}
			});
		}

		var scrollToStory = function () {
			storiesList.forEach(function (story, index) {
				if (story.id === storyId) {
					// HACK: Wait for the ng-repeat element to
					// populate itself. 250 milliseconds should
					// be long enough for our needs.
					$timeout(function () {
						var elementId = "#story-" + index;
						var topMargin = 75;
						// Use jQuery to smooth-scroll to where we
						// want to be.
						$('html, body').animate({
							scrollTop: $(elementId).offset().top - topMargin
						}, 250);

						story.isSelected = true;
						selectedStory = story;
					}, 250);

					// If we ever want to do things the Angular way, 
					// it's closer to this:
					// 	$anchorScroll();
					// 	$location.hash("story-" + index);
				}
			});
		};

		$http.get('/data/story/' + storyId)
		.success(function (story) {
			if (story.projectId !== circleId) {
				// switch the active circle
				var circleFacade = {
					id: story.projectId
				};

				$scope.$emit('setActiveCircle', circleFacade, false, function () {
					$location.path("/stories/" + storyId);
					$route.reload();
				});				
			}
			else {
				scrollToStory();
			}
		})
		.error(function (data, status) {
			errors.log(data, status);
		});
	});

	//-------------------------------------------------------
	// Drag and drop
	//-------------------------------------------------------
	var thisY = undefined;
	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;

	var getLastStoryId = function () {
		return "last-" + circleId;
	};

	var getStoryFacadeFromNode = function (node) {
		return {
			id: node.getAttribute(idAttr)
		};
	};

	var getStoryBefore = function (node) {
		var previousNode = node.previous();
		if (previousNode !== null && previousNode.getAttribute(idAttr)) { 
			return getStoryFacadeFromNode(node.previous());
		}
		else {
			return {
				id: "first"
			};
		}
	};

	var getStoryAfter = function (node) {
		var nextNode = node.next();
		if (nextNode !== null && nextNode.getAttribute(idAttr)) {
			return getStoryFacadeFromNode(node.next());
		}
		else {
			return {
				id: getLastStoryId()
			};
		}
	};

	var storyNodeMoved = function (node) {
		var story = getStoryFacadeFromNode(node);
		var storyBefore = getStoryBefore(node);
		var storyAfter = getStoryAfter(node);

		var movedStory = stories.get(story.id);

		var preMove = {
			storyBefore: stories.get(preMoveStoryBefore.id),
			storyAfter: stories.get(preMoveStoryAfter.id)
		};

		var postMove = {
			storyBefore: stories.get(storyBefore.id),
			storyAfter: stories.get(storyAfter.id)
		};

		if (preMove.storyBefore === postMove.storyBefore
		|| preMove.storyAfter === postMove.storyAfter) {
			// We didn't actually move. Do nothing.
			return;
		}

		var updateModelStoryOrder = function () {
			// If the moved story was the first story, the preMove.storyAfter
			// is now the first story (if it exists).
			if (stories.getFirst().id === movedStory.id && preMove.storyAfter) {
				stories.setFirst(preMove.storyAfter);
			}

			// We need to update 'nextId' of the following:
			// 1. The story before the moved story, before it was moved.		
			if (preMove.storyBefore) {
				preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
			}
			
			// 2. The story before the moved story, after it was moved.
			if (postMove.storyBefore) {
				postMove.storyBefore.nextId = movedStory.id;
			}
			else {
				// No need to set the "nextId" on the "storyBefore," because 
				// there isn't one. Instead, we know that the moved story
				// is now the first story.
				stories.setFirst(movedStory);
			}

			// 3. The story that was moved, unless it's now the last story.
			movedStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();	
		}();
		

		var updateViewModelStoryOrder = function () {
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
			}
			else {
				errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
			}
		}(); // closure

		// Without this $timeout, there is a slight delay
		// in facade mode.
		$timeout(function() {
			stories.move(movedStory, postMove.storyAfter, function (err, response) {
				if (err) {
					// We failed. Probably because of a data integrity issue
					// on the server that we need to wait out. 
					errors.handle(err.data, err.status);
					return;
				}
			});
		}, 0);
	};

	var attachToDragEvents = function (Y) {
		// If a story is selected, (the details panel is open),
		// then don't allow drag events to happen.
		Y.DD.DDM.before('drag:mouseDown', function (e) {
			var drag = e.target;
			var preMoveStoryNode = drag.get('node');
			if (preMoveStoryNode) {
				var storyId = getStoryFacadeFromNode(preMoveStoryNode).id;		    	
				var story = stories.get(storyId);

				if (story.isSelected) {
					e.stopPropagation();
					e.preventDefault();
				}
			}
		});

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


		// Store stuff while we're dragging
		var lastY = 0;
		Y.DD.DDM.on('drag:drag', function(e) {
			//Get the last y point
			var y = e.target.lastXY[1];
			//is it greater than the lastY var?
			if (y < lastY) {
				//We are going up
				goingUp = true;
			} else {
				//We are going down.
				goingUp = false;
			}
			//Cache for next check
			lastY = y;
		});

		Y.DD.DDM.on('drop:over', function(e) {
			//Get a reference to our drag and drop nodes
			var drag = e.drag.get('node'),
				drop = e.drop.get('node');
			
			//Are we dropping on a div node?
			if (drop.get('tagName').toLowerCase() === 'div') {
				//Are we not going up?
				if (!goingUp) {
					drop = drop.next();
				}
				
				// HACK: We're probably doing something wrong, but
				// in the mean time let's try this.
				try {
					e.drop.get('node').get('parentNode').insertBefore(drag, drop);	
				}
				catch (e) {
					handleHierarchyRequestErr(e);
				}
				e.drop.sizeShim();
			}
		});

		Y.DD.DDM.on('drag:drophit', function(e) {
			var drop = e.drop.get('node'),
				drag = e.drag.get('node');

			//if we are not on an div, we must have been dropped on ...
			// ... well, not sure this part of the demo applies to our use case.
			if (drop.get('tagName').toLowerCase() !== 'div') {
				if (!drop.contains(drag)) {
					drop.appendChild(drag);			        
				}
			}
		});
	}

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
		makeStoriesDraggableCore(thisY);
	};

	var activateDragAndDrop = function () {
		// Even though we're waiting for viewContentLoaded, 
		// I guess we need to yield to whatever else is happening.
		$timeout(function () {
			// Reference: http://yuilibrary.com/yui/docs/dd/list-drag.html
			var gesturesIfTouch = Modernizr.touch ? 'dd-gestures' : 'dd-drop';
			YUI({}).use('dd-proxy', 'dd-drop', gesturesIfTouch, function (Y) {
				// keep a local instance of Y around for adding draggable
				// objects in the future.
				thisY = Y;
				makeStoriesDraggableCore(thisY);
				attachToDragEvents(thisY);
			});
		}, 0);
	};

	$scope.$watch('$viewContentLoaded', function (e) {
		activateDragAndDrop();
	});

	$scope.$watch('isFacade', function (newVal) {
		isFacade = newVal;
		stories.setFacade(isFacade);
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
StoryListCtrl.$inject = ['$scope', '$timeout', '$http', '$location', '$route', 'hacks', 'errors'];