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

    var vm = null;

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
        watch('isSearching', scope);

        scope.$watch('stories', function (newVal, oldVal) {
            if (newVal && newVal.length) {
                if (vm) {
                    vm.$data.stories = scope.stories;
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
            if (newVal.length < oldVal.length && vm) {
                vm.$data.stories = newVal;
            }
        });
    }

    function watch (prop, scope) {
        scope.$watch(prop, function (newVal) {
            if (vm) {
                vm.$data[prop] = scope[prop];
            }
        });
    };


    function createVueInstance(scope, highlightedStories) {
        vm = new Vue({
            el: elementId,
            data: {
                stories: scope.stories,
                selectedOwner: scope.selectedOwner,
                selectedLabels: scope.selectedLabels,
                searchEntry: scope.searchEntry,
                isScreenXs: scope.isScreenXs,
                isShowingInsertStory: scope.isShowingInsertStory,
                isClipboardActive: scope.isClipboardActive,
                isSearching: scope.isSearching,
                mindset: scope.mindset,
                owners: scope.owners,
                accountName: scope.accountName
            },
            beforeMount: function () {
                this.scope = scope;
                this.highlightedStories = highlightedStories;
            },
            components: {
                'cb-story-list': StoryList
            },
            template: `<cb-story-list id="sortableList"
                :scope="scope" 
                :stories="stories"
                :highlighted-stories="highlightedStories"
                :selected-owner="selectedOwner"
                :selected-labels="selectedLabels"
                :search-entry="searchEntry"
                :is-screen-xs="isScreenXs"
                :is-showing-insert-story="isShowingInsertStory"
                :is-clipboard-active="isClipboardActive"
                :is-searching="isSearching"
                :initial-mindset="mindset"
                :owners="owners"
                :account-name="accountName"
                ></cb-story-list>`
        });
    }

    return directive;
}]);