'use strict';
var CircleBlvd = {};
CircleBlvd.Services = {};

// Added to make dates format to ISO8601 across browsers
// h/t: http://stackoverflow.com/a/2218874/124487
Date.prototype.toJSON = function (key) {
    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    return this.getUTCFullYear()   + '-' +
         f(this.getUTCMonth() + 1) + '-' +
         f(this.getUTCDate())      + 'T' +
         f(this.getUTCHours())     + ':' +
         f(this.getUTCMinutes())   + ':' +
         f(this.getUTCSeconds())   + '.' +
         f(this.getUTCMilliseconds())   + 'Z';
};

// Declare app level module which depends on filters, and services
angular.module('myApp', [
	'ngRoute',
	'ngSanitize',
	'myApp.filters', 
	'CircleBlvd.services', 
	'myApp.directives']).
	config(['$routeProvider', function ($routeProvider) {

		var homePage = {templateUrl: 'partials/home.html', controller: HomeCtrl};

		$routeProvider.when('/', homePage);
		$routeProvider.when('/stories/:storyId', homePage);
		$routeProvider.when('/stories', homePage);
		$routeProvider.when('/archives', {templateUrl: 'partials/archives.html', controller: ArchivesCtrl});
		$routeProvider.when('/signin', {templateUrl: 'partials/signin.html', controller: SignInCtrl});
		$routeProvider.when('/profile', {templateUrl: 'partials/profile.html', controller: ProfileCtrl});
		$routeProvider.when('/admin', {templateUrl: 'partials/admin.html', controller: AdminCtrl});
		$routeProvider.when('/mainframe', {templateUrl: 'partials/mainframe.html', controller: MainframeCtrl});
		$routeProvider.when('/initialize', {templateUrl: 'partials/initialize.html', controller: InitializeCtrl});
		$routeProvider.when('/fix', {templateUrl: 'partials/fix.html', controller: FixCtrl});
		$routeProvider.otherwise({redirectTo: '/'});
	}])
	.factory('$exceptionHandler', ['$injector', function ($injector) {
        return function (exception, cause) {
        	var $route = $injector.get("$route");
        	var $log = $injector.get("$log");
        	// Only seeing this in Safari ...
        	if (exception.name === "HIERARCHY_REQUEST_ERR") {
        		$log.error("TopLevelCtrl: Hierarchy request error caught. Reloading.");
        		$route.reload();
        		return;
        	}
        	$log.error.apply($log, arguments);
        };
    }]);
	// .
	// config(['$locationProvider', function ($locationProvider) {
	// 	$locationProvider.html5Mode(true);
	// 	$locationProvider.hashPrefix('!');
	// }]);
