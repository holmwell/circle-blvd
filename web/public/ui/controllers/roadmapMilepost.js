'use strict';

function RoadmapMilepostCtrl($scope, $timeout) {

    var pulse = $scope.pulse; // from StoryListCtrl

    var scrollToAndPulse = function (story) {
        var qStory = $("[data-left-story-id='" + story.id + "']");
        qStory = qStory.find('.story');
        if (!qStory) {
            return;
        }
                
        var delay = 500;
        // Give the story time to close before
        // starting the scroll animation.
        $timeout(function () {
            $('body').animate({
                // scrollTopWhenSelected
                scrollTop: qStory.offset().top - 20
            }, delay);

            $timeout(function () {
                pulse(story);
            }, delay + 75);
        }, 100);
    };


    $scope.scrollToMilepost = function (milepost) {
        scrollToAndPulse(milepost);
    };
}
RoadmapMilepostCtrl.$inject = ['$scope', '$timeout'];