'use strict';

angular.module('CircleBlvd.directives').
directive('spStorySummary', function () {
    return {
        restrict: 'E',
        templateUrl: 'ui/views/storySummary.html',
        controller: StorySummaryCtrl
    };
});