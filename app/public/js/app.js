'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives']).
  config(['$routeProvider', function($routeProvider) {
  	$routeProvider.when('/', {templateUrl: 'partials/home.html', controller: HomeCtrl});
    $routeProvider.when('/signin', {templateUrl: 'partials/signin.html', controller: SignInCtrl});
    $routeProvider.when('/profile', {templateUrl: 'partials/profile.html', controller: ProfileCtrl});
    $routeProvider.when('/admin', {templateUrl: 'partials/admin.html', controller: AdminCtrl});
    $routeProvider.when('/initialize', {templateUrl: 'partials/initialize.html', controller: InitializeCtrl});
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
