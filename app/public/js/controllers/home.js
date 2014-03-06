function HomeCtrl($scope, $timeout, $document, $http) {

	var projectId = "1";
	var thisY = undefined;
	var selectedStory = undefined;

	var stories = {};
	var usefulStories = {};

	var idAttr = 'data-story-id';
	var preMoveStoryNode = undefined;
	var preMoveStoryBefore = undefined;
	var preMoveStoryAfter = undefined;


	$scope.stories = stories;

	// TODO: Ignoring the server side while constructing
	// the notion of a persistant sort on the client side.
	//
	// $http.get('/data/stories/' + projectId)
	// .success(function (data) {
	// 	stories = data;
	// 	$scope.stories = stories;	
	// 	$timeout(makeStoriesDraggable, 0);
	// })
	// .error(function (data, status) {
	// 	console.log('failure');
	// 	console.log(status);
	// 	console.log(data);
	// });

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
			console.log(foundBox);
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

	var insertFirstStory = function (story, sortIndex) {
		// it's useful to keep track of the first story
		story.sortIndex = sortIndex;
		stories[sortIndex] = story;
		usefulStories.first = story;
	};

	var insertNewStory = function (newStory) {
		var newStorySortIndex;

		// base case
		if (!usefulStories.first) {
			newStorySortIndex = 1.0;
			insertFirstStory(newStory, newStorySortIndex);
			return;
		}
		
		// put our new story halfway between our first story and 0.
		var firstStory = usefulStories.first;
		newStorySortIndex = firstStory.sortIndex / 2.0;
		insertFirstStory(newStory, newStorySortIndex);
	};

	$scope.create = function (newStory) {
		$http.get('/data/stories/newId')
		.success(function (data) {
			newStory.id = data;
			insertNewStory(newStory);

			$scope.newStory = undefined;
			$timeout(makeStoriesDraggable, 0);
		})
		.error(function (data, status) {
			console.log('failure');
			console.log(status);
			console.log(data);
		});
	};

	$scope.save = function (story) {
		console.log('save');
	};

	$scope.remove = function (story) {
		console.log('remove');
	};

	var getStoryFacadeFromNode = function (node) {
		return {
			id: node.getAttribute(idAttr),
			sortIndex: node.getAttribute('data-story-sort-index')
		};
	};

	var getStoryBefore = function (node) {
		var previousNode = node.get('previousSibling');
		if (previousNode.getAttribute(idAttr)) { 
			return getStoryFacadeFromNode(node.get('previousSibling'));
		}
		else {
			return {
				id: "first",
				sortIndex: 0.0
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
				id: "last",
				sortIndex: 2.0
			};
		}
	};

	var storyNodeMoved = function (node) {
		var story = getStoryFacadeFromNode(node);
		var storyBefore = getStoryBefore(node);
		var storyAfter = getStoryAfter(node);

		if (preMoveStoryBefore.sortIndex === storyBefore.sortIndex
		|| preMoveStoryAfter.sortIndex === storyAfter.sortIndex) {
			// We didn't actually move. Do nothing.
			return;
		}

		// If we moved the first story, update it with the new first story.
		if (usefulStories.first.id === story.id) {
			usefulStories.first = stories[preMoveStoryAfter.sortIndex];
		}

		var oldIndex = story.sortIndex;
		var newIndex = (+storyBefore.sortIndex + +storyAfter.sortIndex) / 2.0;		

		if (storyBefore.id === "first") {
			insertFirstStory(stories[oldIndex], newIndex);
		}
		else {
			stories[newIndex] = stories[oldIndex];
			stories[newIndex].sortIndex = newIndex;
		}

		delete stories[oldIndex];
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
		    preMoveStoryNode = drag.get('node');
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

	$scope.$on('$viewContentLoaded', activateDragAndDrop);
}
HomeCtrl.$inject = ['$scope', '$timeout', '$document', '$http'];
