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

        var homePage = {templateUrl: 'ui/views/home.html', controller: HomeCtrl};

        $routeProvider.when('/', homePage);
        $routeProvider.when('/signin', {templateUrl: 'ui/views/signin.html', controller: SignInCtrl});

        $routeProvider.when('/stories/:storyId', homePage);
        $routeProvider.when('/stories', homePage);
        $routeProvider.when('/lists', {templateUrl: 'ui/views/lists.html', controller: ListsCtrl});
        $routeProvider.when('/archives', {templateUrl: 'ui/views/archives.html', controller: ArchivesCtrl});
        $routeProvider.when('/profile', {templateUrl: 'ui/views/profile.html', controller: ProfileCtrl});
        $routeProvider.when('/admin', {templateUrl: 'ui/views/admin.html', controller: AdminCtrl});

        $routeProvider.when('/about', {templateUrl: 'ui/views/about.html', controller: AboutCtrl});
        $routeProvider.when('/sponsor', {templateUrl: 'ui/views/sponsor.html', controller: SponsorCtrl});
        $routeProvider.when('/docs', {templateUrl: 'ui/views/docs.html', controller: DocsCtrl});
        $routeProvider.when('/donate', {templateUrl: 'ui/views/donate.html', controller: DonateCtrl});

        $routeProvider.when('/mainframe', {templateUrl: 'ui/views/mainframe.html', controller: MainframeCtrl});
        $routeProvider.when('/initialize', {templateUrl: 'ui/views/initialize.html', controller: InitializeCtrl});
        $routeProvider.when('/fix', {templateUrl: 'ui/views/fix.html', controller: FixCtrl});

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
