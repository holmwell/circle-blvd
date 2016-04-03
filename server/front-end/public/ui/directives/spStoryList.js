'use strict';

angular.module('CircleBlvd.directives').
directive('spStoryList', function () {
    return {
        restrict: 'E',
        templateUrl: 'ui/views/storyList.html',
        controller: StoryListCtrl,
        scope: {
            data: '=',
            accountName: '=',
            owners: '=',
            enableAltMode: '=',
            mindset: '=',
            isFacade: '=',
            isChecklist: '=',
            keyboard: '=',
            mouse: '='
        }
    }
});