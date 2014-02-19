function HomeCtrl($scope, $timeout) {

	var selectedStory = undefined;
	var stories = [];
	for (var i=0; i < 10; i++) {
		stories[i] = {
			id: i,
			summary: "Story"
		}
	}

	$scope.stories = stories;

	$scope.select = function (story) {
		if (selectedStory) {
			selectedStory.isSelected = false;
		}

		story.isSelected = true;
		selectedStory = story;
	};

	$scope.$on('$viewContentLoaded', function() {
		// Even though we're waiting for viewContentLoaded, 
		// I guess we need to yield to whatever else is happening.
		$timeout(function () {
			// Use the demo from http://yuilibrary.com/yui/docs/dd/list-drag.html
			YUI().use('dd-constrain', 'dd-proxy', 'dd-drop', function (Y) {

				// Allow stories to be dragged
				var storyElements = Y.Node.all('.story');
				storyElements.each(function (v, k) {
					var dd = new Y.DD.Drag({
						node: v,
						target: {
							padding: '0 0 0 20'
						}
					}).plug(Y.Plugin.DDProxy, {
						moveOnEnd: false
					}).plug(Y.Plugin.DDConstrained, {
						// whatever. no constraints for now. maybe later.
					});
				});


				// Show a semi-transparent version of the story selected.
				Y.DD.DDM.on('drag:start', function(e) {
				    //Get our drag object
				    var drag = e.target;
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
				        //Resize this nodes shim, so we can drop on it later.
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


			});
		}, 0);
	});
}
HomeCtrl.$inject = ['$scope', '$timeout'];
