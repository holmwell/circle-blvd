'use strict';

function TourCtrl(lib, $scope, $location, $routeParams) {
	var me = "Me";

	$scope.whoami = me;	
	$scope.isFacade = true;
	lib.mindset.set('detailed');
	$scope.hideHeader();

	var sectionToShow = $routeParams.section || 'tags';
	
	$scope.show = function (section) {
		switch (section) {
			case 'bump':
			case 'roadmap':
				$location.path('/tour/plan/' + section);
				break;
			default:
				$location.path('/tour/plan');
				break;
		}
	};

	$scope.isShowing = function (section) {
		return sectionToShow === section;
	}

	var getTaskListFromArray = function (list) {
		var table = {};

		// Make unique IDs so we can have multiple lists
		// on the same page. (So, that isn't really true,
		// but this code is here and it's fine.)
		var ids = [];
		for (var i=0; i < list.length; i++) {
			ids.push("random-" + (Math.floor(Math.random() * 1000000)).toString());
		}

		for (var i=0; i < list.length; i++) {
			var story = list[i];
			// Convert strings into objects with a summary,
			// otherwise keep as is.
			if (typeof story === 'string') {
				story = {
					summary: story
				};
			}
			
			// First story
			if (i === 0) {
				story.isFirstStory = true;
			}

			var id = ids[i];
			story._id = id;
			story.id = id;

			var nextId = ids[i + 1];
			// Last story		
			if (i === list.length - 1) {
				nextId = "last-demo";
			}
			story.nextId = nextId

			story.createdBy = {
				name: "Demo"
			};
			table[story.id] = story;
		}

		var data = {
			first: table[ids[0]],
			list: table
		}
		return data;
	};

	var startList = [];
	startList.push("Find road atlas for Pacific Northwest");
	startList.push("Sign up for dance lessons");
	startList.push("Ask friends for music suggestions");
	startList.push({
		isNextMeeting: true,
		summary: "That's all for today"
	});
	
	var startData = getTaskListFromArray(startList);


	var bumpList = [];
	bumpList.push({
		isNextMeeting: true,
		summary: "Next meeting"
	});
	bumpList.push("Write thank-you cards");
	bumpList.push("Review reading list");
	bumpList.push("Visit friends in Corvallis");

	var bumpData = getTaskListFromArray(bumpList);


	var tagList = [];
	tagList.push("Home: Clean the kitchen");
	tagList.push("Home: Take out the trash");
	tagList.push({
		summary: "#Grocery: Milk",
		labels: ["Grocery"]
	});
	tagList.push({
		summary: "#Grocery: Eggs",
		labels: ["Grocery"]
	});
	
	var tagData = getTaskListFromArray(tagList);

	var roadmapList = [];
	roadmapList.push("One");
	roadmapList.push("Two");
	roadmapList.push("Three");
	roadmapList.push({
		summary: "Next draft",
		isNextMeeting: true
	});
	roadmapList.push({
		summary: "A milepost",
		isDeadline: true
	});

	var roadmapData = getTaskListFromArray(roadmapList);


	$scope.demo = {
		firstStory: startData.first,
		allStories: startData.list
	};

	$scope.tags = {
		firstStory: tagData.first,
		allStories: tagData.list
	};

	$scope.bump = {
		firstStory: bumpData.first,
		allStories: bumpData.list
	};

	$scope.roadmap = {
		firstStory: roadmapData.first,
		allStories: roadmapData.list
	};


	var detailStory = {};
	detailStory.isSelected = true;
	detailStory.summary = "A one-line summary of the task";
	detailStory.owner = "Task owner"
	detailStory.createdBy = {
		name: "Demo"
	};
	detailStory.description = 
		"1. Put whatever you want here.\n" +
		"2. Change the task status with the buttons below.";

	$scope.storyDetails = [];
	$scope.storyDetails.push(detailStory);

	// Show the tags section on the plan page.
	if ($location.path().indexOf('/plan') > 0) {
		$scope.show(sectionToShow);
	}
}
TourCtrl.$inject = ['lib', '$scope', '$location', '$routeParams'];