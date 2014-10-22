function StoryListCtrl($scope, $timeout, $http, $location, $route, lib, hacks, errors) {
	var circleId = undefined;
	var listId = undefined;

	var selectedStory = undefined;
	var storiesList = [];
	var stories = CircleBlvd.Services.stories($http);
	var isFacade = false;
	var isChecklist = false;

	var selectedLabels = [];
	$scope.selectedLabels = selectedLabels;

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

	var buildStoryList = function (firstStory, serverStories) {
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
			buildStoryList(newVal.firstStory, newVal.allStories);
			buildMilepostList(storiesList);
			$scope.nextMeeting = findNextMeeting();
		}
		else {
			circle = undefined;
			circleId = undefined;
			listId = undefined;
			$scope.stories = [];
			$scope.mileposts = [];
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
		scrollToAndPulse(story);		
	});

	$scope.$on('insertNewStory', function (e, newStory, callback) {
		stories.insertFirst(newStory, circleId, listId, function (serverStory) {
			// add the new story to the front of the backlog.
			storiesList.unshift(serverStory);
			if (callback) {
				callback(serverStory);
			}
		});
	});

	$scope.$on('storyMovedToTop', function (e, story) {
		e.stopPropagation();
		e.preventDefault();

		var storyToMove = stories.get(story.id);
		var nextMeeting = findNextMeeting();

		if (storyToMove.id === nextMeeting.id) {
			// Not possible, but whatever. Do nothing.
			return;
		}

		// Update data model
		// TODO: Refactor, to share the same code used below
		var preMove = {
			storyBefore: stories.getPrevious(story, storyToMove),
			storyAfter: stories.get(storyToMove.nextId)
		};

		var postMove = {
			storyBefore: stories.getPrevious(nextMeeting, nextMeeting),
			storyAfter: nextMeeting
		};

		// We need to update 'nextId' of the following:
		// 1. The story before the moved story, before it was moved.		
		if (preMove.storyBefore) {
			preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
		}

		// 2. ...
		if (postMove.storyBefore) {
			postMove.storyBefore.nextId = storyToMove.id;
		}
		else {
			stories.setFirst(storyToMove);	
		}
		
		// 3. ...
		storyToMove.nextId = nextMeeting.id;

		// Update view model
		updateViewModelStoryOrder();

		// ...
		$timeout(function () {
			pulse(storyToMove);
		}, 100);

		// Update server
		$timeout(function() {
			stories.move(storyToMove, nextMeeting, function (err, response) {
				if (err) {
					// We failed. Probably because of a data integrity issue
					// on the server that we need to wait out. 
					errors.handle(err.data, err.status);
					return;
				}
				else {					
					$scope.$emit('storyMoved', storyToMove);
				}
			});
		}, 0);
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
		});
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
				scrollToStory();
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

	$scope.clearFilter = function () {
		selectedLabels = [];
		$scope.selectedLabels = selectedLabels;
	};

	$scope.deselectLabel = function (text) {
		var labelIndex = selectedLabels.indexOf(text);
		if (labelIndex >= 0) {
			selectedLabels.splice(labelIndex, 1);	
		}
	};

	$scope.shouldHideStory = function (story) {
		var shouldHide = false;
		// Labels
		if (selectedLabels.length > 0) {
			shouldHide = false;

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
		
		return shouldHide;
	};

	$scope.isMindset = function (m) {
		if ($scope.mindset) {
			return $scope.mindset === m;
		}
		return lib.mindset.is(m);
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
			errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
		}
	};

	//-------------------------------------------------------
	// Drag and drop
	//-------------------------------------------------------
	var thisY = undefined;
	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;

	var getLastStoryId = function () {
		return "last-" + (listId || circleId);
	};

	var getStoryFacadeFromElement = function (el) {
		return {
			id: el.attr(idAttr)
		};
	};

	var getStoryBefore = function (el) {
		var previousElement = el.prev();
		if (previousElement !== null && previousElement.attr(idAttr)) { 
			return getStoryFacadeFromElement(el.prev());
		}
		else {
			return {
				id: "first"
			};
		}
	};

	var getStoryAfter = function (el) {
		var nextElement = $(el).next();
		if (nextElement !== null && nextElement.attr(idAttr)) {
			return getStoryFacadeFromElement(el.next());
		}
		else {
			return {
				id: getLastStoryId()
			};
		}
	};


	var startMove = function (ui) {
		// It's useful to know the state of things before the move.
		var preMoveStoryElement = ui.item;
		preMoveStoryBefore = getStoryBefore(preMoveStoryElement);
		// TODO: This does NOT work. However, we work around it below.
		// preMoveStoryAfter = getStoryAfter(ui.item);

		var storyId = getStoryFacadeFromElement(preMoveStoryElement).id;		    	
		var story = stories.get(storyId);
		story.isMoving = true; // TODO: Remove this.
		story.isBeingDragged = true;

		// getStoryAfter(), above, doesn't seem to work 
		// how we want at this point in time.
		var nextStory = stories.get(story.nextId);
		if (nextStory) {
			preMoveStoryAfter = { id: story.nextId };
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

	var storyNodeMoved = function (ui) {
		var story = getStoryFacadeFromElement(ui.item);
		var storyBefore = getStoryBefore(ui.item);
		var storyAfter = getStoryAfter(ui.item);

		var movedStory = stories.get(story.id);

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

		if (preMove.storyBefore === postMove.storyBefore
		|| preMove.storyAfter === postMove.storyAfter) {
			// We didn't actually move. Do nothing.
			movedStory.isBeingDragged = false;

			if ($scope.isMindset('roadmap')) {
				// HACK: I can't figure out how to deal with this situation
				// right now, and I think rebinding the page is better
				// than leaving an artifact
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
					allStories: hackAllStories
				};
				$scope.$apply(function () {
					$timeout(function () {
						makeStoriesDraggable();
					}, 500);	
				});
			}

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
		
		updateViewModelStoryOrder();

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
				else {
					$scope.$emit('storyMoved', movedStory);
				}
				movedStory.isBeingDragged = false;
			});
		}, 0);
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

	var newDraggable = function () {
		$('#sortableList').sortable({
			handle: ".grippy",
			placeholder: "dragging-row",
			forcePlaceholderSize: true,
			opacity: 0.75,
			tolerance: "pointer",
			scrollSensitivity: 25,
			deactivate: function (event, ui) {
				// ui.item.removeClass('dragging');
				storyNodeMoved(ui);
			},
			start: function (event, ui) {
				// The drop shadow slows down the phones a bit
				// ui.item.addClass('dragging');
				startMove(ui);
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

	$scope.$watch('$viewContentLoaded', function (e) {
		activateDragAndDrop();
	});

	$scope.$watch('isFacade', function (newVal) {
		isFacade = newVal;
		stories.setFacade(isFacade);
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
StoryListCtrl.$inject = ['$scope', '$timeout', '$http', '$location', '$route', 'lib', 'hacks', 'errors'];