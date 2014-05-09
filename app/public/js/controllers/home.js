function HomeCtrl($scope, $timeout, $http, $location) {

	var projectId = "1";
	var thisY = undefined;
	var selectedStory = undefined;

	var stories = [];
	var usefulStories = {};

	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;

	var saveStory = function (story, callback) {
		$http.put('/data/story/', story)
		.success(function (savedStory) {
			if (callback) {
				callback(savedStory);
			}
		})
		.error(function (data, status) {
			console.log(status);
			console.log(data);
		});
	};

	var apply = function () {
		$scope.$apply(function () {

		});
	};

	var focusElement = function (elementId) {
		var element = document.getElementById(elementId);
		if (element) {
			// We want this to happen after this method
			// finishes.
			$timeout(function() {
				element.focus();
			}, 0);
		}
	};	

	// wrap around getting and setting the server-side stories,
	// so we can push to the server when we set things. there's
	// probably a better way / pattern for doing this. feel free
	// to implement it, future self.
	var serverStories = function() {
		var s = {};

		return {
			init: function (data) {
				s = data;
			},
			add: function (story, callback) {
				$http.post('/data/story/', story)
				.success(function (newStory) {
					s[newStory.id] = newStory;
					callback(newStory);
				})
				.error(function (data, status) {
					console.log(status);
					console.log(data);
				});
			},
			move: function (story, newNextStory, callback) {
				var body = {};
				body.story = story;

				if (newNextStory) {
					body.newNextId = newNextStory.id;
				}
				else {
					body.newNextId = "last";
				}

				$http.put('/data/story/move', body)
				.success(function (response) {
					// TODO: Move stuff around or something
					callback(null, response);
				})
				.error(function (data, status) {
					callback({
						status: status,
						data: data
					});
				});
			},
			get: function (storyId) {
				return s[storyId];
			},
			set: function (storyId, story, callback) {
				if (s[storyId]) {
					s[storyId] = story;
					// update story
					saveStory(story, function (savedStory) {
						if (callback) {
							callback(savedStory);
						}
					});	
				}				
			},
			all: function() {
				return s;
			},
			remove: function (storyId) {
				// TODO: Right now the server-side is handled outside of
				// this class. Should probably make things be consistent. 
				if (s[storyId]) {
					delete s[storyId];
				}
			}
		};
	}(); // closure;

	var usefulStories = function() {
		var s = {};
		s.first = undefined;

		return {
			setFirst: function (story) {
				if (s.first) {
					s.first.isFirstStory = false;
				}
				s.first = story;
				if (s.first) {
					s.first.isFirstStory = true;	
				}
			},
			getFirst: function () {
				return s.first;
			},
			hasFirst: function() {
				if (s.first) {
					return true;
				}
				else {
					return false;
				}
			}
		};
	}(); // closure


	$scope.isAdding = [];
	$scope.isAdding['story'] = false;
	$scope.isAdding['deadline'] = false;

	$scope.showEntry = function (panelName) {
		if (!panelName) {
			$scope.isAddingNew = true;
			$scope.showEntry('story');
			// TODO: Focus for all the story types
			focusElement('defaultEntry');
		}
		else {
			for (var pName in $scope.isAdding) {
				$scope.isAdding[pName] = false;
			}
			$scope.isAdding[panelName] = true;
		}
	};
	$scope.hideEntry = function () {
		$scope.isAddingNew = undefined;
	};


	$scope.select = function (story) {
		// TODO: This does NOT work on the story that
		// was most recently moved.
		
		if (story.justDeselected) {
			// HACK: So right now whenever we call deselect,
			// the click event also bubbles up (or whatever)
			// to this method.
			story.justDeselected = undefined;
			return;
		}

		// Do not refocus stuff if we're already on this story.
		if (!story.isSelected) {
			if (selectedStory) {
				selectedStory.isSelected = false;
			}

			story.isSelected = true;
			selectedStory = story;

			var boxId = "boxForStory" + story.id;
			var foundBox = document.getElementById(boxId);
			if (foundBox) {
				// console.log(foundBox);
				// We want this to happen after this method
				// finishes.
				$timeout(function() {
					foundBox.focus();
				}, 0);
			}	
		}	
	};

	$scope.deselect = function (story) {

		if (story && story.isSelected) {
			story.isSelected = false;
			story.justDeselected = true;
			
			selectedStory = undefined;
		}
	};

	$scope.deselectAll = function () {
		// TODO: Figure out how to call this only
		// when we want to. Right now, since it is
		// attached to the #backlog, it is also called
		// every time a .story is clicked.

		// if (selectedStory) {
		// 	selectedStory.isSelected = false;
		// 	selectedStory = undefined;	
		// }
	};

	// TODO: Soon ...
	// var insertStory = function (story, afterStory, beforeStory) {

	// };

	var insertFirstStory = function (story, callback) {
		var hadFirstStoryPreviously = usefulStories.hasFirst();
		if (hadFirstStoryPreviously) {
			story.nextId = usefulStories.getFirst().id;	
		}

		story.projectId = projectId;
		story.type = "story";

		usefulStories.setFirst(story);
		serverStories.add(story, function (newStory) {

			var serverStory = serverStories.get(newStory.id);
			if (newStory.isFirstStory) {
				usefulStories.setFirst(serverStory);	
			}
			else {
				// TODO: Probably want to refresh the whole list 
				// from the server, because some crazy things are
				// happening!
			}

			// add the new story to the front of the backlog.
			stories.unshift(serverStory);

			if (callback) {
				callback();
			}
		});
	};

	var insertNewStory = function (newStory, callback) {
		insertFirstStory(newStory, callback);
	};

	$scope.create = function (newStory, callback) {
		insertNewStory(newStory, function () {
			$scope.newStory = undefined;
			$timeout(makeStoriesDraggable, 0);
			if (callback) {
				callback(newStory);
			}
		});
	};

	$scope.createDeadline = function (newDeadline) {
		newDeadline.isDeadline = true;
		insertNewStory(newDeadline, function () {
			$scope.newDeadline = undefined;
			$timeout(makeStoriesDraggable, 0);
		});
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

		var getPreviousStory = function (story) {
			var previousStory = story;
			if (usefulStories.getFirst().id === story.id) {
				return undefined;
			}

			var currentStory = usefulStories.getFirst();
			while (currentStory) {
				if (currentStory.nextId === serverStory.id) {
					previousStory = currentStory;
					return previousStory;
				}
				currentStory = serverStories.get(currentStory.nextId);
			}

			// TODO: If we get here, the story doesn't exist.
			return previousStory;
		};

		if (viewStory.isSelected) {
			viewStory.isSelected = false;
			selectedStory = undefined;
		}

		var previousStory = getPreviousStory(viewStory);
		if (!previousStory) {
			usefulStories.setFirst(nextStory);
		}
		else {
			previousStory.nextId = nextStory ? nextStory.id : "last";
		}

		var storyIndex = stories.indexOf(viewStory);
		stories.splice(storyIndex, 1);
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
				id: "last"
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
			if (usefulStories.getFirst().id === movedStory.id && preMove.storyAfter) {
			 	usefulStories.setFirst(preMove.storyAfter);
			 	storiesToSave[preMove.storyAfter.id] = preMove.storyAfter;
			}

			// We need to update 'nextId' of the following:
			// 1. The story before the moved story, before it was moved.		
			if (preMove.storyBefore) {
				preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : "last";
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
				storiesToSave[usefulStories.getFirst().id] = usefulStories.getFirst();
				usefulStories.setFirst(movedStory);
				storiesToSave[movedStory.id] = movedStory;
			}

			// 3. The story that was moved, unless it's now the last story.
			movedStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : "last";
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

				var firstStory = usefulStories.getFirst();
				var currentStory = firstStory;
				
				while (currentStory) {
					storiesInNewOrder.push(currentStory);
					currentStory = serverStories.get(currentStory.nextId);
				}

				if (storiesInNewOrder.length === stories.length) {
					// Update isAfterNextMeeting for all stories
					storiesInNewOrder = applyNextMeeting(storiesInNewOrder);

					// Update our view with the proper story order
					//
					// TODO: We really only need to update the range of
					// stories affected, not all of them, but that can 
					// be a performance optimization later.
					for (var key in storiesInNewOrder) {
						stories[key] = serverStories.get(storiesInNewOrder[key].id);
					}
				}
				else {
					console.log("Something unknown happened with the move. Need to refresh page.")
				}
			}(); // closure
		});
	};

	var attachToDragEvents = function (Y) {
		// Show a semi-transparent version of the story selected.
		Y.DD.DDM.on('drag:start', function(e) {
		    //Get our drag object
		    var drag = e.target;
	
			// It's useful to know the state of things before the move.
		    var preMoveStoryNode = drag.get('node');
			preMoveStoryBefore = getStoryBefore(preMoveStoryNode);
			preMoveStoryAfter = getStoryAfter(preMoveStoryNode);

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
				}).plug(Y.Plugin.DDConstrained, {
					// whatever. no constraints for now. maybe later.
				});
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
			YUI().use('dd-constrain', 'dd-proxy', 'dd-drop', function (Y) {
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

	$scope.isStoryActive = function (story) {
		return isStoryStatus(story, "active");
	}

	$scope.isStoryDone = function (story) {
		return isStoryStatus(story, "done");
	}

	// $scope.showNextMeeting = function () {
	// 	var body = {};
	// 	body.showNextMeeting = true;
	// 	$http.put("/data/1/settings/show-next-meeting", body)
	// 	.success(function (data) {
	// 		console.log(":-)");
	// 	})
	// 	.error(function (data, status) {
	// 		console.log(status);
	// 		console.log(data);
	// 	});
	// };

	$scope.debug = function() {
		console.log("Scope array: ");
		$scope.stories.forEach(function (el, index) {
			if (index < 7) {
				console.log(index);
				console.log(el);	
			}
		});

		console.log("Array: ");
		stories.forEach(function (el, index) {
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
		// console.log(usefulStories.getFirst());
	};

	$scope.resetStories = function() {
		// var storyCount = stories.length;
		// for (var i=storyCount; i > 0; i--) {
		// 	$scope.remove(stories[i - 1]);
		// }

		$scope.create({
   			"summary": "one",
   			"projectId": "1"
		}, function () { 
			$scope.create({
   				"summary": "two",
   				"projectId": "1"
			}, function () {
				$scope.create({
   					"summary": "three",
    				"projectId": "1"
				});
			});
		});	
	};

	$scope._test = function() {
		return {
			firstStory: usefulStories.getFirst(),
			storiesTable: serverStories
		}
	};

	var init = function() {
		// TODO: Possibly put this at the TopLevelCtrl?
		if (!$scope.isSignedIn()) {
			$location.path('/signin');
			return;
		}

		$scope.owners = [];
		$scope.stories = stories;

		$http.get('/data/' + projectId + '/first-story')
		.success(function (firstStory) {

			$http.get('/data/' + projectId + '/stories')
			.success(function (data) {

				stories = [];
				serverStories.init(data);
				usefulStories.setFirst(serverStories.get(firstStory.id));

				// TODO: If we don't have a first story, relax.
				var currentStory = usefulStories.getFirst();
				var isAfterNextMeeting = false;

				while (currentStory) {
					stories.push(currentStory); // <3 pass by reference

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

				$scope.stories = stories;
				$timeout(makeStoriesDraggable, 0);
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

		$http.get("/data/x/users/names")
		.success(function (names) {
			$scope.owners = names;
		})
		.error(function (data, status) {
			console.log('get names failure');
			console.log(status);
			console.log(data);			
		});

		$scope.$on('$viewContentLoaded', activateDragAndDrop);
		// $scope.showEntry();
	};

	init();
}
HomeCtrl.$inject = ['$scope', '$timeout', '$http', '$location'];
