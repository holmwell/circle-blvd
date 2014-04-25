'use strict';

describe('HomeCtrl', function(){
	var ctrl;

	// angular services
	var $scope;
	var $httpBackend;
	// var $timeout;
	// var $document;
	
	var initHttpBackend = function($injector) {
		var $httpBackend = $injector.get('$httpBackend'); 
		var stories = {
			"1": {
				"id": "1",
    			"summary": "one",
    			"projectId": "1",
    			"nextId": "2",
    			"isFirstStory": true
			},
  			"2": {
    			"id": "2",
    			"summary": "two",
    			"projectId": "1",
    			"nextId": "3",
    			"isFirstStory": false
  			},
  			"3": {
    			"id": "3",
    			"summary": "three",
    			"projectId": "1",
    			"isFirstStory": false
  			}
		};


		$httpBackend.when('GET', '/data/1/first-story')
		.respond(stories["1"]);

		$httpBackend.when('GET', '/data/1/stories')
		.respond(stories);

		$httpBackend.when('PUT', '/data/story/')
		.respond(200);

		$httpBackend.when('PUT', '/data/story/remove')
		.respond(200);

		$httpBackend.when('POST', '/data/story/')
		.respond(200);

		return $httpBackend;
	};

	beforeEach(inject(function ($injector) {
		$scope = $injector.get('$rootScope').$new();
		$httpBackend = initHttpBackend($injector);

		var params = {
		 	'$scope': $scope,
		// Angular takes care of injecting these:
		 	// '$timeout': $timeout,
		 	// '$document': $document,
		 	// '$http': $httpBackend
		};

		var $controller = $injector.get('$controller');
		ctrl = $controller(HomeCtrl, params);

		// Actually be ready to test
		$httpBackend.flush();
	}));

	var expectOneFirstStory = function (stories) {
		var firstStoryCount = 0;
		stories.forEach(function (story) {
			if (story.isFirstStory) {
				firstStoryCount++;
			}
		}); 
		expect(firstStoryCount).toBe(1);
	};

	var expectValidStories = function(stories) {
		if (stories.length === 0) {
			return;
		}
		expectOneFirstStory($scope.stories);
	};

	var getFirstStory = function() {
		return $scope._test().firstStory;
	};

	// tests
	it('can remove two stories at once', function () {
		var expectedStoryCount = $scope.stories.length;
		var storyToRemove1 = $scope.stories[0];
		var storyToRemove2 = $scope.stories[1];
		var firstStoryAfterRemove = 
			$scope._test().storiesTable.get(storyToRemove2.nextId);

		$scope.remove(storyToRemove1);
		$scope.remove(storyToRemove2);
		$httpBackend.flush();

		expectedStoryCount -= 2;
		expect($scope.stories.length).toBe(expectedStoryCount);
		expect(getFirstStory()).toBe(firstStoryAfterRemove);
		expectValidStories($scope.stories);
	});

	it('can remove a story', function () {
		var expectedStoryCount = $scope.stories.length;
		var storyToRemove = $scope.stories[0];
		var firstStoryAfterRemove = 
			$scope._test().storiesTable.get(storyToRemove.nextId);

		$scope.remove(storyToRemove);
		$httpBackend.flush();

		expectedStoryCount--;
		expect($scope.stories.length).toBe(expectedStoryCount);
		expect(getFirstStory()).toBe(firstStoryAfterRemove);
		expectValidStories($scope.stories);
	});

	it('can create two stories at once', function () {
		var expectedStoryCount = $scope.stories.length;

		var story1 = {
			summary: "first",
			projectId: "1"
		};

		var story2 = {
			summary: "second",
			projectId: "1"
		};

		$scope.create(story1);
		$scope.create(story2);
		$httpBackend.flush();
		expectedStoryCount += 2;

		expect($scope.stories.length).toBe(expectedStoryCount);
		expect(getFirstStory()).toBe(story2);
		expectValidStories($scope.stories);
	});

	it('can create a new story', function () {
		var expectedStoryCount = $scope.stories.length;

		var newStory = {
			summary: "new",
			projectId: "1"
		};

		$scope.create(newStory);
		$httpBackend.flush();
		expectedStoryCount++;

		expect($scope.stories.length).toBe(expectedStoryCount);
		expect(getFirstStory()).toBe(newStory);
		expectValidStories($scope.stories);	
	});

	it('has mocked stories after init', function () {
		expect($scope.stories.length).toBeGreaterThan(0);
		expectValidStories($scope.stories);
	});

	it('should be instantiable', function () {
		expect(ctrl).not.toBe(null);
	});
});