'use strict';
angular.module('CircleBlvd.directives').
directive('spSortableListWrapper', [ 
function () {
    // We're a wrapper around a Vue component.
    var elementId = "#sortableList";
    return {
        require: '^^cbHighlightedStories',
        restrict: 'A',
        link: function (scope, element, attr, highlightedStories) {
            scope.$watch('stories', function (newVal, oldVal) {
                if (newVal && newVal.length) {
                    if (scope.vue) {
                        scope.vue.$data.stories = scope.stories;
                    }
                    else {
                       mount();
                    }
                }
            });

            function mount() {
                scope.vue = new Vue({
                    el: elementId,
                    data: {
                        stories: scope.stories
                    },
                    methods: {
                        archive: function (id) {
                            // TODO: This works, but then our list is not updated.
                            scope.$emit('storyArchived', { id: id });
                        },
                        highlight: function (id) {
                            scope.$emit('storyHighlight', id, 'single');
                        },
                        updateStory: function (newVal) {
                            for (var index in this.stories) {
                                var story = this.stories[index];
                                if (story.id === newVal.id) {
                                    Vue.set(this.stories, index, newVal);
                                }
                            }
                        },
                        selectLabel: function (text) {
                            scope.$emit('labelSelected', text);
                        }
                    },
                    created: function () {
                        var self = this;
                        scope.$on('storyHighlighted', function (e, story) {
                            self.updateStory(story);
                        });
                        scope.$on('storyUnhighlighted', function (e, story) {
                            self.updateStory(story);
                        });
                        scope.$on('storyOrderUpdated', function () {
                            for (var index in scope.stories) {
                                Vue.set(self.stories, index, scope.stories[index]);
                            }
                        });


                    }
                });

            }
        }
    }
}]);