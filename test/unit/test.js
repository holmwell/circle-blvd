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

		$httpBackend.when('GET', '/data/1/first-story')
		.respond({
			"id": "2",
			"summary": "two",
			"projectId": "1",
			"nextId": "3",
			"isFirstStory": true
		});

		$httpBackend.when('GET', '/data/1/stories')
		.respond({
  			"2": {
    			"id": "2",
    			"summary": "two",
    			"projectId": "1",
    			"nextId": "3",
    			"isFirstStory": true
  			},
  			"3": {
    			"id": "3",
    			"summary": "three",
    			"projectId": "1",
    			"isFirstStory": false
  			}
		});

		var newStoryId = 2;
		var getNextId = function() {
			newStoryId++;
			return [200, "" + newStoryId, {}];
		};

		$httpBackend.when('GET', '/data/1/new-story-id')
		.respond(getNextId);

		$httpBackend.when('PUT', '/data/story/')
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

	// tests
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
		expect($scope._test().firstStory).toBe(story2);
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
		expect($scope._test().firstStory).toBe(newStory);
		expectValidStories($scope.stories);	
	});

	it('mock of new-story-id works', function () {
		var expectedStoryId = $scope.stories.length;
		var newStory = {
			summary: "new",
			projectId: "1"
		};

		for (var i=0; i < 5; i++) {
			$scope.create(newStory, function (story) {
				expectedStoryId++;
				expect(story.id).toBe("" + expectedStoryId);
			});
			$httpBackend.flush();
		}
	});

	it('has mocked stories after init', function () {
		expect($scope.stories.length).toBeGreaterThan(0);
		expectValidStories($scope.stories);
	});

	it('should be instantiable', function () {
		expect(ctrl).not.toBe(null);
	});
});