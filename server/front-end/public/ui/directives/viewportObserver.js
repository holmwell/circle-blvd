// A viewport observer is used for broadcasting
// events when the viewport changes -- in other
// words, when the document scrolls.
'use strict';

angular.module('CircleBlvd.directives').
directive('cbViewportObserver', 
    ['$document', '$interval', '$timeout', 
    function ($document, $interval, $timeout) {
        return {
            link: function (scope, element, attr) { 
                var didScroll = false;
                $document.bind('scroll', function (e) {
                    didScroll = true;
                }); 

                // TODO: Is $scope.broadcast the Angular way to do things?
                $interval(function () {
                    if (didScroll) {
                        didScroll = false;
                        $timeout(function () {
                            $scope.$broadcast('viewportChanged');
                        }, 50);
                    }
                }, 200);
            }
        }
    }]
);