'use strict';

function TourCtrl(lib, $scope, $window) {
	var me = "Me";

	$scope.whoami = me;	
	$scope.isFacade = true;
	lib.mindset.set('detailed');
	$scope.hideHeader();

	var sectionToShow = 'tags';
	var workSectionToShow = 'details';

	var pathname = $window.location.pathname;
	if (pathname.indexOf('/tour/start') === 0 
	|| pathname.endsWith('/tour')) {
		sectionToShow = pathname.slice('/tour/start/'.length);
		sectionToShow = sectionToShow || 'intro';
	}

	if (pathname.indexOf('/tour/work/') === 0) {
		workSectionToShow = pathname.slice('/tour/work/'.length);
		workSectionToShow = workSectionToShow || 'details';
	}

	if (pathname.indexOf('/tour/plan/') === 0) {
		sectionToShow = pathname.slice('/tour/plan/'.length);
		sectionToShow = sectionToShow || 'tags';
	}
	
	var setLocation = function (path) {
		if ($window.location.pathname == path) {
			return;
		}
		else {
			$window.location.href = path;
		}
	}

	$scope.show = function (section) {
		switch (section) {
			case 'intro':
				setLocation('/tour');
				break;
			case 'list':
			case 'team':
			case 'app':
				setLocation('/tour/start/' + section);
				break;

			case 'details':
				setLocation('/tour/work');
				break;
			case 'mileposts':
			case 'checklists':
			case 'status':
				setLocation('/tour/work/' + section);
				break;

			case 'bump':
			case 'roadmap':
				setLocation('/tour/plan/' + section);
				break;
			default:
				setLocation('/tour/plan');
				break;
		}
	};

	$scope.isShowing = function (section) {
		return sectionToShow === section || workSectionToShow === section;
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
	startList.push("Pick first road trip destination");
	startList.push("Buy snacks");
	startList.push({
		isNextMeeting: true,
		summary: "Next planning meeting"
	});
	startList.push({
		isDeadline: true,
		summary: "Begin road trip"
	});
	
	var startData = getTaskListFromArray(startList);


	var bumpList = [];
	bumpList.push({
		isNextMeeting: true,
		summary: "Next"
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


	var milepostsData = getTaskListFromArray([
		{
			summary: "Our special event",
			isDeadline: true
		},
		{
			summary: "Next meeting",
			isNextMeeting: true
		},
		"Reserve the venue",
		"Find what we're looking for",
		{
			summary: "Someday / Maybe",
			isDeadline: true
		}
	]);

	var statusData = getTaskListFromArray([
		{
			summary: "My favorite thing to do",
			owner: me,
			status: "assigned"
		},
		"Check out the planning section"
	]);

	var getViewModel = function (data) {
		return {
			firstStory: data.first,
			allStories: data.list
		}
	};

	$scope.demo = getViewModel(startData);

	$scope.mileposts = getViewModel(milepostsData);
	$scope.status = getViewModel(statusData);

	$scope.tags = getViewModel(tagData);
	$scope.bump = getViewModel(bumpData);
	$scope.roadmap = getViewModel(roadmapData);



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
	if ($window.location.pathname.indexOf('/plan') > 0) {
		$scope.show(sectionToShow);
	}

	// Show the details section on the work page.
	if ($window.location.pathname.indexOf('/work') > 0) {
		$scope.show(workSectionToShow);
	}
}
TourCtrl.$inject = ['lib', '$scope', '$window'];