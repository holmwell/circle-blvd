'use strict';

describe('HomeCtrl', function(){
	var ctrl;

	// angular services
	var $scope;
	// var $document;
	// var $timeout;
	// var $httpBackend;

	beforeEach(inject(function ($injector) {
		$scope = $injector.get('$rootScope').$new();

		// var $timeout = $injector.get('$timeout');
		// var $document = $injector.get('$document');
		var $httpBackend = $injector.get('$httpBackend'); // TODO: httpBackend

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

		var params = {
			'$scope': $scope,
			// Angular takes care of injecting these:
			// '$timeout': $timeout,
			// '$document': $document,
			// '$http': $httpBackend
		};

		var $controller = $injector.get('$controller');
		ctrl = $controller(HomeCtrl, params);
	}));

	// tests
	it('should be instantiable', function () {
		expect(ctrl).not.toBe(null);
	});

	// it('whatever', function () {
	// 	// console.log('ok!')
	// 	// var s = $scope.stories;
	// 	// for (var story in s) {
	// 	// 	console.log(story);
	// 	// }
	// });

});