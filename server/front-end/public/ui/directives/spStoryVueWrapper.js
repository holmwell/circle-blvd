'use strict';
angular.module('CircleBlvd.directives').
directive('spStoryVueWrapper', [ 
function () {
    // We're a wrapper around a Vue component.
    return {
        require: '^^cbHighlightedStories',
        restrict: 'A',
        link: function (scope, element, attr, highlightedStories) {
            scope.vue = new Vue({
                el: 'cb-story-angular-interop',
                data: function () {
                    var model = scope.story;
                    return {
                        // Each property has to be referenced individually
                        story: {
                            isSelected: model.isSelected,

                            isFirstStory: model.isFirstStory,
                            isFirstAtLoad: model.isFirstAtLoad,

                            isAfterNextMeeting: model.isAfterNextMeeting,
                            isDeadline: model.isDeadline,
                            isHighlighted: model.isHighlighted,
                            isNextMeeting: model.isNextMeeting,

                            summary: model.summary,
                        }
                    }
                },

                methods: {
                    highlight: function () {
                        // Pass the Angular objects up the Angular methods
                        highlightedStories.highlight(scope.story, 'single');
                    },
                    updateSelf: function (newVal, oldVal) {
                        for (var prop in newVal) {
                            if (prop[0] !== '$') {
                                this.story[prop] = newVal[prop];
                            }
                        }
                    }
                },
                created: function () {
                    // Connect to Angular changes on scope.story, because those changes
                    // occur outside our Vue event / watch loop, and we need a way to
                    // react to them.
                    var self = this;
                    var watchCollection = true;

                    scope.$watch('story', function (newVal, oldVal) {
                        self.updateSelf(newVal, oldVal);
                     }, watchCollection);
                },
                template: '<cb-story v-bind="story" @highlight="highlight"></cb-story>',
            });
        }
    }
}]);