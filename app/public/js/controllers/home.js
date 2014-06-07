function HomeCtrl(session, stories, hacks, $scope, $timeout, $http, $location, $routeParams, $route) {

	var projectId = session.activeCircle;
	var thisY = undefined;
	var selectedStory = undefined;

	var storiesList = [];
	var serverStories = stories;

	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;
	var isDragging = false;

	var getLastStoryId = function () {
		return "last-" + projectId;
	};

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


	$scope.select = function (story) {
		if (isDragging) {
			// Do nothing. We're dragging. See the note
			// in 'drag:end' as to why.
			return;
		}

		// Do not refocus stuff if we're already on this story.
		if (!story.isSelected) {
			// Deselect the story that was selected previously
			if (selectedStory) {
				selectedStory.isSelected = false;
			}

			story.isSelected = true;
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
		}	
	};

	$scope.deselect = function (story, event) {
		if (story && story.isSelected) {
			story.isSelected = false;
			
			selectedStory = undefined;
			if (event) {
				event.stopPropagation();	
			}
		}
	};

	var insertNewStory = function (newStory, callback) {
		stories.insertFirst(newStory, projectId, function (serverStory) {
			// add the new story to the front of the backlog.
			storiesList.unshift(serverStory);
			if (callback) {
				callback(serverStory);
			}
		});
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

	$scope.save = function (story) {
		var storyToSave = serverStories.get(story.id);
		
		// TODO: We can probably just have this on the 
		// server side, but it's nice to have clean
		// traffic I guess.
		storyToSave.summary = story.summary;
		storyToSave.owner = story.owner;
		storyToSave.status = story.status;
		storyToSave.description = story.description;

		storyToSave.newComment = story.newComment;
		
		serverStories.set(story.id, storyToSave, function (savedStory) {
			story.newComment = undefined;
			story.comments = savedStory.comments;
			$scope.deselect(story);
		});
	};

	var removeFromView = function (viewStory, serverStory) {

		var nextStory = serverStories.get(serverStory.nextId);

		if (viewStory.isSelected) {
			viewStory.isSelected = false;
			selectedStory = undefined;
		}

		if (stories.isListBroken()) {
			$scope.isBacklogBroken = true;
			return;
		}

		var previousStory = getPreviousStory(viewStory);
		if (!previousStory) {
			stories.setFirst(nextStory);
		}
		else {
			previousStory.nextId = nextStory ? nextStory.id : getLastStoryId();
		}

		var storyIndex = storiesList.indexOf(viewStory);
		storiesList.splice(storyIndex, 1);
		serverStories.remove(viewStory.id);

		// TODO: Do we need this for 'remove'?
		// $timeout(makeStoriesDraggable, 0);
	};

	$scope.archive = function (story) {
		var storyToArchive = serverStories.get(story.id);
		$http.put('/data/story/archive', storyToArchive)
		.success(function (data) {
			removeFromView(story, storyToArchive);
		})
		.error(function (data) {
			console.log(data);
		});
	};

	$scope.remove = function (story) {
		// TODO: This one time all the stories after the
		// removed story were no longer shown, but the
		// data was fine on the server so a refresh 
		// took care of everything. Look into this data
		// display issue.
		var storyToRemove = serverStories.get(story.id);
		
		$http.put('/data/story/remove', storyToRemove)
		.success(function (data) {
			removeFromView(story, storyToRemove);
		})
		.error(function (data, status) {
			console.log('failure');
			console.log(status);
			console.log(data);
		});
	};

	$scope.notify = function (story, event) {
		if (!story.isNotifying && !story.isOwnerNotified) {
			story.isNotifying = true;

			var notificationSuccessful = function () {
				story.isNotifying = undefined;
				story.isOwnerNotified = true;
			};

			$http.post('/data/story/notify/new', story)
			.success(function (data) {
				notificationSuccessful();
			})
			.error (function (data, status) {
				story.isNotifying = undefined;
				console.log("Notify error");
				console.log(status);
				console.log(data);
			});

			event.stopPropagation();
		}		
	};

	var scrollToStorySpecifiedByUrl = function () {
		var storyId = $routeParams.storyId;

		if (!storyId) {
			return;
		}

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
			if (story.projectId !== projectId) {
				// switch the active circle
				var circleFacade = {
					id: story.projectId
				};
				$scope.setActiveCircle(circleFacade, false);
				$location.path("/stories/" + storyId);
				$route.reload();
			}
			else {
				scrollToStory();
			}
		})
		.error(function (data, status) {
			console.log(data);
			console.log(status);
		});
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

		var movedStory = serverStories.get(story.id);

		var preMove = {
			storyBefore: serverStories.get(preMoveStoryBefore.id),
			storyAfter: serverStories.get(preMoveStoryAfter.id)
		};

		var postMove = {
			storyBefore: serverStories.get(storyBefore.id),
			storyAfter: serverStories.get(storyAfter.id)
		};

		if (preMove.storyBefore === postMove.storyBefore
		|| preMove.storyAfter === postMove.storyAfter) {
			// We didn't actually move. Do nothing.
			return;
		}

		var newNextId = storyAfter.id;
		serverStories.move(movedStory, postMove.storyAfter, function (err, response) {
			if (err) {
				// We failed. Probably because of a data integrity issue
				// on the server that we need to wait out. 
				//
				// TODO: Get the latest list of stories, and notify
				// the guest what's up.
				console.log(err);
				return;
			}
			// If the moved story was the first story, the preMove.storyAfter
			// is now the first story (if it exists).
			var storiesToSave = [];
			if (stories.getFirst().id === movedStory.id && preMove.storyAfter) {
			 	stories.setFirst(preMove.storyAfter);
			 	storiesToSave[preMove.storyAfter.id] = preMove.storyAfter;
			}

			// We need to update 'nextId' of the following:
			// 1. The story before the moved story, before it was moved.		
			if (preMove.storyBefore) {
				preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
				storiesToSave[preMove.storyBefore.id] = preMove.storyBefore;
			}
			
			// 2. The story before the moved story, after it was moved.
			if (postMove.storyBefore) {
				postMove.storyBefore.nextId = movedStory.id;
				storiesToSave[postMove.storyBefore.id] = postMove.storyBefore;
			}
			else {
				// No need to set the "nextId" on the "storyBefore," because 
				// there isn't one. Instead, we know that the moved story
				// is now the first story.
				storiesToSave[stories.getFirst().id] = stories.getFirst();
				stories.setFirst(movedStory);
				storiesToSave[movedStory.id] = movedStory;
			}

			// 3. The story that was moved, unless it's now the last story.
			movedStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();
			storiesToSave[movedStory.id] = movedStory;	
			
			// TODO: We don't need these 'storiesToSave' any more.
			//
			// if a story is to be saved, only do it once, to avoid
			// simple document conflicts.
			//
			// This functionality has moved to the server side.
			// TODO: We'll want to react to the server response.
			//
			// for (var storyId in storiesToSave) {
			// 	saveStory(storiesToSave[storyId]);
			// }

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

			// TODO: Use this in a future optimization
			var findStoryIndex = function (story) {
				// O(n)
				for (var index in $scope.stories) {
					if ($scope.stories[index].id === story.id) {
						return index;
					}
				}

				return -1;
			};

			var updateViewModelStoryOrder = function () {
				var storiesInNewOrder = [];

				if (stories.isListBroken()) {
					$scope.isBacklogBroken = true;
					return;
				}

				var firstStory = stories.getFirst();
				var currentStory = firstStory;
				
				while (currentStory) {
					storiesInNewOrder.push(currentStory);
					currentStory = serverStories.get(currentStory.nextId);
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
						storiesList[key] = serverStories.get(storiesInNewOrder[key].id);
					}
				}
				else {
					console.log("Something unknown happened with the move. Need to refresh page.")
				}
			}(); // closure
		});
	};

	var attachToDragEvents = function (Y) {
		// If a story is selected, (the details panel is open),
		// then don't allow drag events to happen.
		Y.DD.DDM.before('drag:mouseDown', function (e) {
			var drag = e.target;
		    var preMoveStoryNode = drag.get('node');
		    if (preMoveStoryNode) {
				var storyId = getStoryFacadeFromNode(preMoveStoryNode).id;		    	
				var story = serverStories.get(storyId);

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
			var story = serverStories.get(storyId);
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
		    isDragging = true;
		    $timeout(function () {
		    	isDragging = false;
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
		        //Add the node to this list
		        e.drop.get('node').get('parentNode').insertBefore(drag, drop);
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

	var makeStoriesDraggable = function () {
		makeStoriesDraggableCore(thisY);
	};

	var activateDragAndDrop = function () {
		// Even though we're waiting for viewContentLoaded, 
		// I guess we need to yield to whatever else is happening.
		$timeout(function () {
			// Use the demo from http://yuilibrary.com/yui/docs/dd/list-drag.html
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

	var isStory = function (story) {
		if (!story || story.isDeadline || story.isNextMeeting) {
			return false;
		}

		return true;
	};

	$scope.setStoryStatus = function (story, status) {
		if (story) {
			story.status = status;
			// TODO: Do we need this serverStory runaround?
			var serverStory = serverStories.get(story.id);
			stories.save(serverStory);
		}
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
		if (story.owner) {
			var owner = story.owner.toLowerCase();
			var member = $scope.getAccountName().toLowerCase();
			if (owner === member) {
				return true;
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
					$scope.setStoryStatus(story, statusOrder[index]);
				}
			}
			else {
				// Do this here so we can move from sad to 
				// assigned in one go
				if ($scope.isStoryNew(story)) {
					$scope.setStoryStatus(story, 'assigned');
				};
			}
		}
	};


	$scope.debug = function() {
		console.log("Scope array: ");
		$scope.stories.forEach(function (el, index) {
			if (index < 7) {
				console.log(index);
				console.log(el);	
			}
		});

		console.log("Array: ");
		storiesList.forEach(function (el, index) {
			if (index < 7) {
				console.log(index);
				console.log(el);	
			}
		});

		// console.log("Assoc array: ");
		// var ss = serverStories.all();
		// var counter = 0;
		// for (var storyId in ss) {
		// 	if (counter < 7) {
		// 		console.log(ss[storyId]);
		// 		counter++;	
		// 	}
		// };

		// console.log("First story: ");
		// console.log(stories.getFirst());
	};

	$scope.test = function () {
		var stories = [{
   			"summary": "one",
   			"projectId": "1"
		},{
   			"summary": "two",
   			"projectId": "1"
		},{
   			"summary": "three",
   			"projectId": "1"
		}];

		insertFirstStory(stories[0], projectId, function (story) {
			console.log("0");
			console.log(story);
		});

		insertFirstStory(stories[1], projectId, function (story) {
			console.log("1");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

		insertFirstStory(stories[2], projectId, function (story) {
			console.log("2");
			console.log(story);
		});

	};

	$scope._test = function() {
		return {
			firstStory: stories.getFirst(),
			storiesTable: serverStories
		}
	};

	var init = function() {
		$scope.owners = [];
		$scope.stories = storiesList;

		$http.get('/data/' + projectId + '/first-story')
		.success(function (firstStory) {

			$http.get('/data/' + projectId + '/stories')
			.success(function (data) {

				storiesList = [];
				serverStories.init(data);
				stories.setFirst(serverStories.get(firstStory.id));
				serverStories.get(firstStory.id).isFirstAtLoad = true;

				if (stories.isListBroken()) {
					$scope.isBacklogBroken = true;
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
						currentStory = serverStories.get(nextStoryId);
					}
					else {
						currentStory = undefined;
					}
				}

				$scope.stories = storiesList;
				$timeout(makeStoriesDraggable, 0);
				scrollToStorySpecifiedByUrl();

				// For designing
				// $scope.select(stories.getFirst());
			})
			.error(function (data, status) {
				console.log('failure');
				console.log(status);
				console.log(data);
			});
		})
		.error(function (data, status) {
			console.log('failure');
			console.log(status);
			console.log(data);

			if (status === 401 && $scope.isSignedIn()) {
				// We're not actually signed in.
				$scope.signOut();
			}
		});

		$http.get("/data/" + projectId + "/users/names")
		.success(function (names) {
			$scope.owners = names;
		})
		.error(function (data, status) {
			console.log('get names failure');
			console.log(status);
			console.log(data);			
		});

		$scope.$on('$viewContentLoaded', function() {
			activateDragAndDrop();
		});

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

		// UX: Hide story-entry panel at first.
		// $scope.showEntry();
	};

	init();
}
HomeCtrl.$inject = ['session', 'stories', 'hacks', '$scope', '$timeout', '$http', '$location', '$routeParams', '$route'];
