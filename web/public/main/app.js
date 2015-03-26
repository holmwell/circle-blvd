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

CircleBlvd.Prelude = angular.module('cbPrelude', [
    'ngRoute',
    'ngSanitize',
    'myApp.filters',
    'CircleBlvd.services',
    'myApp.directives']);

// Declare app level module which depends on filters, and services
angular.module('myApp', [
    'ngRoute',
    'ngSanitize',
    'myApp.filters', 
    'CircleBlvd.services', 
    'myApp.directives']).
    config(['$routeProvider', function ($routeProvider) {

        var homePage = {templateUrl: 'ui/views/home.html', controller: HomeCtrl};
        var useServerRoute = {templateUrl: 'ui/views/redirecting.html', controller: RemoveHashCtrl};

        $routeProvider.when('/', homePage);

        $routeProvider.when('/stories/:storyId', homePage);
        $routeProvider.when('/stories', homePage);
        $routeProvider.when('/lists', {templateUrl: 'ui/views/lists.html', controller: ListsCtrl});
        $routeProvider.when('/archives', {templateUrl: 'ui/views/archives.html', controller: ArchivesCtrl});
        $routeProvider.when('/profile', {templateUrl: 'ui/views/profile.html', controller: ProfileCtrl});
        $routeProvider.when('/admin', {templateUrl: 'ui/views/admin.html', controller: AdminCtrl});

        $routeProvider.when('/contact', {templateUrl: 'ui/views/contact.html', controller: ContactCtrl});

        $routeProvider.when('/mainframe', {templateUrl: 'ui/views/mainframe.html', controller: MainframeCtrl});
        $routeProvider.when('/initialize', {templateUrl: 'ui/views/initialize.html', controller: InitializeCtrl});
        $routeProvider.when('/fix', {templateUrl: 'ui/views/fix.html', controller: FixCtrl});

        // Legacy routes. These routes have since moved to the server side,
        // but there might still be links in the wild, so we need to keep
        // them active, possibly forever.
        $routeProvider.when('/about', useServerRoute);
        $routeProvider.when('/privacy', useServerRoute);
        $routeProvider.when('/sponsor', useServerRoute);
        $routeProvider.when('/donate', useServerRoute);
        $routeProvider.when('/docs', useServerRoute);
        $routeProvider.when('/tour', useServerRoute);
        $routeProvider.when('/tour/work', useServerRoute);
        $routeProvider.when('/tour/work/:section', useServerRoute);
        $routeProvider.when('/tour/plan', useServerRoute);
        $routeProvider.when('/tour/plan/:section', useServerRoute);
        $routeProvider.when('/invite/:inviteId', useServerRoute);
        $routeProvider.when('/invite', useServerRoute);


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
    //  $locationProvider.html5Mode(true);
    //  $locationProvider.hashPrefix('!');
    // }]);
