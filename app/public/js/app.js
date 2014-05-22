'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
	'ngRoute',
	'ngSanitize',
	'myApp.filters', 
	'myApp.services', 
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
		$routeProvider.when('/gatekeeper', {templateUrl: 'partials/gatekeeper.html', controller: GatekeeperCtrl});
		$routeProvider.when('/initialize', {templateUrl: 'partials/initialize.html', controller: InitializeCtrl});
		$routeProvider.otherwise({redirectTo: '/'});
	}]);
	// .
	// config(['$locationProvider', function ($locationProvider) {
	// 	$locationProvider.html5Mode(true);
	// 	$locationProvider.hashPrefix('!');
	// }]);
