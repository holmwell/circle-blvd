'use strict';

angular.module('CircleBlvd.directives').
directive('autosize', ['$timeout', function ($timeout) {
    return {
        restrict: 'A',
        link: function(scope, elem, attr, ctrl) {
            // Uses: https://github.com/jackmoore/autosize
            // If this isn't in a timeout block then it
            // gets fired before things are ready to be
            // resized.
            $timeout(function () {
                var isOneRow = attr.rows === "1";
                // This allows us to have the comments area
                // stay at 1 row until people click on it.
                if (isOneRow) {
                    elem.focus(function () {
                        elem.autosize();
                    })
                }

                // For elements that are initially hidden,
                // do not run autosize right now. Also do not
                // run autosize on elements that are meant to be
                // one row to begin with.
                if (!angular.isDefined(attr.showModel) && !isOneRow) {
                    elem.autosize();
                }

                // Trigger a resize when the model value is
                // changed to "" or something equivalent.
                scope.$watch(attr.ngModel, function (newVal) {
                    if (!newVal) {
                        elem.trigger('autosize.resize');
                    }
                    // TODO: Maybe just always trigger a resize
                    // event when the model changes. That would
                    // need to be tested, though, and maybe at
                    // that point we should just switch libraries.
                    //  
                    // The lib we are using is relatively old.
                });

                // For special occasions
                scope.$on('autosize-manual-resize', function () {
                    elem.trigger('autosize.resize');
                });
 
                // showModel is a variable that is set to true when
                // the textarea is to be shown. We need this if we 
                // want to resize elements that are initially hidden.
                scope.$watch(attr.showModel, function (newVal, oldVal) {
                    if (!oldVal && newVal) {
                        $timeout(function () {
                            elem.autosize();
                        });
                    }
                });
            });
        }
    };
}]);