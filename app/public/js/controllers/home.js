function HomeCtrl($scope, $timeout, $document, $http) {

	var projectId = "1";
	var thisY = undefined;
	var selectedStory = undefined;

	var stories = [];
	var usefulStories = {};

	var idAttr = 'data-story-id';
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;

	var saveStory = function (story) {
		$http.put('/data/story/', story)
		.success(function (data) {
			// do nothing
		})
		.error(function (data, status) {
			console.log(status);
			console.log(data);
		});
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
			get: function (storyId) {
				return s[storyId];
			},
			// TODO: Might want to use callbacks.
			set: function (storyId, story) {
				if (s[storyId]) {
					s[storyId] = story;
					// update story
					saveStory(story);	
				}
				else {
					s[storyId] = story;
					// create story
					$http.post('/data/story/', story)
					.success(function (data) {
						// do nothing
					})
					.error(function (data, status) {
						console.log(status);
						console.log(data);
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


	$scope.select = function (story) {
		// TODO: This does NOT work on the story that
		// was most recently moved.
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

	var insertFirstStory = function (story) {
		var hadFirstStoryPreviously = usefulStories.hasFirst();
		if (hadFirstStoryPreviously) {
			story.nextId = usefulStories.getFirst().id;	
		}

		story.projectId = projectId;
		story.type = "story";

		usefulStories.setFirst(story);
		serverStories.set(story.id, story);
		var serverStory = serverStories.get(story.id);

		stories.unshift(serverStory);
		usefulStories.setFirst(serverStory);
		// Save the previously-first story.
		if (hadFirstStoryPreviously) {
			saveStory(serverStories.get(serverStory.nextId));	
		}
	};

	var insertNewStory = function (newStory) {
		insertFirstStory(newStory);
	};

	$scope.create = function (newStory, callback) {
		$http.get('/data/' + projectId + '/new-story-id')
		.success(function (data) {
			newStory.id = data;
			insertNewStory(newStory);

			$scope.newStory = undefined;
			$timeout(makeStoriesDraggable, 0);
			if (callback) {
				callback(newStory);
			}
		})
		.error(function (data, status) {
			console.log('failure');
			console.log(status);
			console.log(data);
		});
	};

	$scope.save = function (story) {
		var storyToSave = serverStories.get(story.id);
		
		storyToSave.summary = story.summary;
		// TODO: Probably want a callback here
		saveStory(storyToSave);

		storyToSave.isSelected = false;
		selectedStory = undefined;
	};

	$scope.remove = function (story) {
		var storyToRemove = serverStories.get(story.id);
		var nextStory = serverStories.get(storyToRemove.nextId);

		var getPreviousStory = function (story) {
			var previousStory = story;
			if (usefulStories.getFirst().id === story.id) {
				return undefined;
			}

			var currentStory = usefulStories.getFirst();
			while (currentStory) {
				if (currentStory.nextId === storyToRemove.id) {
					previousStory = currentStory;
					return previousStory;
				}
				currentStory = serverStories.get(currentStory.nextId);
			}

			// TODO: If we get here, the story doesn't exist.
			return previousStory;
		};

		$http.put('/data/story/remove', storyToRemove)
		.success(function (data) {
			if (story.isSelected) {
				story.isSelected = false;
				selectedStory = undefined;
			}

			// TODO: Removing the first story does not work.
			// Nothing is set as the first story.
			var previousStory = getPreviousStory(story);
			if (!previousStory) {
				usefulStories.setFirst(nextStory);
				// TODO: Should this be saveStory()?
				if (nextStory) {
					serverStories.set(nextStory.id, nextStory);	
				}
			}
			else {
				previousStory.nextId = nextStory ? nextStory.id : "last";
				serverStories.set(previousStory.id, previousStory);
			}

			var storyIndex = stories.indexOf(storyToRemove);
			stories.splice(storyIndex, 1);
			serverStories.remove(story.id);

			// TODO: Do we need this for 'remove'?
			$timeout(makeStoriesDraggable, 0);
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
		var previousNode = node.get('previousSibling');
		if (previousNode.getAttribute(idAttr)) { 
			return getStoryFacadeFromNode(node.get('previousSibling'));
		}
		else {
			return {
				id: "first"
			};
		}
	};

	var getStoryAfter = function (node) {
		var nextNode = node.get('nextSibling');
		if (nextNode.getAttribute(idAttr)) {
			return getStoryFacadeFromNode(node.get('nextSibling'));
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
			preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : undefined;
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
		movedStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : undefined;
		storiesToSave[movedStory.id] = movedStory;	
		
		// if a story is to be saved, only do it once, to avoid
		// simple document conflicts.
		for (var storyId in storiesToSave) {
			saveStory(storiesToSave[storyId]);
		}

		$scope.$apply(function () {
			// do nothing
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
		    drag.get('node').setStyle('opacity', '.25');
		    drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
		    drag.get('dragNode').setStyles({
		        opacity: '.5',
		        borderColor: drag.get('node').getStyle('borderColor'),
		        backgroundColor: drag.get('node').getStyle('backgroundColor')
		    });
		});

		// Revert styles on drag end
		Y.DD.DDM.on('drag:end', function(e) {
		    var drag = e.target;
		    var n = drag.get('node');

		    storyNodeMoved(n);

		    //Put our styles back
		    drag.get('node').setStyles({
		        visibility: '',
		        opacity: '1'
		    });
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
		            drop = drop.get('nextSibling');
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
		var storyElements = Y.Node.all('.story');
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

	$scope.debug = function() {
		console.log("Array: ");
		stories.forEach(function (el) {
			console.log(el);
		});

		console.log("Assoc array: ");
		var ss = serverStories.all();
		for (var storyId in ss) {
			console.log(ss[storyId]);
		};
	};

	$scope._test = function() {
		return {
			firstStory: usefulStories.getFirst()
		}
	};

	var init = function() {
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

				while (currentStory) {
					stories.push(currentStory); // <3 pass by reference
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
		});

		$scope.$on('$viewContentLoaded', activateDragAndDrop);
	};

	init();
}
HomeCtrl.$inject = ['$scope', '$timeout', '$document', '$http'];
