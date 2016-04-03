'use strict';

angular.module('CircleBlvd.directives').
directive('spRoadmapMilepost', function () {
    return {
        restrict: 'E',
        templateUrl: 'ui/views/roadmapMilepost.html',
        controller: RoadmapMilepostCtrl
    };
});