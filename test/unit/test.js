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

	// tests
	it('should be instantiable', function () {
		expect(ctrl).not.toBe(null);
	});

	iit('has mocked stories after init', function () {
		expect($scope.stories.length).toBe(2);
	});

});