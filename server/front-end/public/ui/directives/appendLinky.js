'use strict';

// TODO: Is this even used anymore?
angular.module('CircleBlvd.directives').
directive('appendLinky', ['$filter', function ($filter) {
    return {
        restrict: 'A',
        replace: true,
        scope: { ngModel: '=ngModel' },
        link: function (scope, element, attrs, controller) {
            scope.$watch('ngModel', function (value) {
                value = $filter('linky')(value);
                element.html(element.html() + value);
            });
        }
    };
}]);