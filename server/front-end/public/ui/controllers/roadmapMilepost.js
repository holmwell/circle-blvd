'use strict';

function RoadmapMilepostCtrl($scope, $timeout) {

    var scrollToAndPulse = function (story) {
        $scope.$emit('scrollToAndPulseStory', story, "data-left-story-id");
    };

    $scope.scrollToMilepost = function (milepost) {
        scrollToAndPulse(milepost);
    };
}
RoadmapMilepostCtrl.$inject = ['$scope', '$timeout'];