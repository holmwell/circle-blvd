'use strict';

angular.module('CircleBlvd.directives').
directive('spStory', function () {
    return {
        restrict: 'E',
        templateUrl: 'ui/views/story.html',
        controller: StoryCtrl
    };
});