'use strict';

describe('HomeCtrl', function(){
	var ctrl;

	// angular services
	var scope;
	var doc;
	var timeout;
	var http;

	beforeEach(inject(function ($injector, $rootScope, $controller) {
		scope = $rootScope.$new();
		timeout = $injector.get('$timeout');
		doc = $injector.get('$document');
		http = $injector.get('$http'); // TODO: httpBackend

		var params = {
			$scope: scope,
			$timeout: timeout,
			'$document': doc,
			$http: http
		};

		ctrl = $controller(HomeCtrl, params);
	}));

	// tests
	it('should be instantiable', function () {
		expect(ctrl).not.toBe(null);
	});


});