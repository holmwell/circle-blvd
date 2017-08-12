'use strict';
angular.module('CircleBlvd.directives').
directive('spStoryVueWrapper', [ 
function () {
    // We're a wrapper around a Vue component.
    return {
        restrict: 'A',
        link: function (scope, element) {
            scope.vue = new Vue({
                el: 'cb-story-angular-interop',
                data: function () {
                    return {
                        story: scope.story
                    };
                },
                template: '<cb-story v-bind:model="story"></cb-story>'
            });
        }
    }
}]);