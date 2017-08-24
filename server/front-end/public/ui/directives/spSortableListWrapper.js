'use strict';

import StoryList from '../../../components/cbStoryList.vue';

angular.module('CircleBlvd.directives').directive('spSortableListWrapper', [ function () {
    // We're a wrapper around a Vue component.
    var elementId = "#sortableList";

    var directive = {
        require: '^^cbHighlightedStories',
        restrict: 'A',
        link: link
    };

    function link (scope, element, attr, highlightedStories) {
        // The role of this directive is to serve as an interop
        // between the Angular story list directive and our 
        // Vue-based sortable list.
        //
        // Here we watch for changes to the many scope properties
        // we depend upon to properly render our list.
        watch('isScreenXs', scope);
        watch('searchEntry', scope);
        watch('selectedOwner', scope);
        watch('selectedLabels', scope);
        watch('isShowingInsertStory', scope);
        watch('isClipboardActive', scope);

        scope.$watch('stories', function (newVal, oldVal) {
            if (newVal && newVal.length) {
                if (scope.vue) {
                    scope.vue.$data.stories = scope.stories;
                }
                else {
                   createVueInstance(scope, highlightedStories);
                }
            }
        });

        scope.$watchCollection('stories', function (newVal, oldVal) {
            if (!newVal || !oldVal) 
                return;
            // When our Angular parent removes a story from the list,
            // we arrive here. Update our local data based on the 
            // new collection.
            if (newVal.length < oldVal.length && scope.vue) {
                scope.vue.$data.stories = newVal;
            }
        });
    }

    function createVueInstance(scope, highlightedStories) {
        scope.vue = new Vue({
            el: elementId,
            data: {
                stories: scope.stories,
                selectedOwner: scope.selectedOwner,
                selectedLabels: scope.selectedLabels,
                searchEntry: scope.searchEntry,
                isScreenXs: scope.isScreenXs,
                isShowingInsertStory: scope.isShowingInsertStory,
                isClipboardActive: scope.isClipboardActive,
                mindset: scope.mindset
            },
            beforeMount: function () {
                this.scope = scope;
                this.highlightedStories = highlightedStories;
            },
            components: {
                'cb-story-list': StoryList
            }
        });
    }


    function watch (prop, scope) {
        scope.$watch(prop, function (newVal) {
            if (scope.vue) {
                scope.vue.$data[prop] = scope[prop];
            }
        });
    };

    return directive;
}]);