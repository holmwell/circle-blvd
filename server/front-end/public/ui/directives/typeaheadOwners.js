'use strict';

angular.module('CircleBlvd.directives').
directive('typeaheadOwners', function () {
    return {
        restrict: 'A',
        link: function(scope, elem, attr, ctrl) {
            // Uses: https://github.com/twitter/typeahead.js
            var array = scope.owners; 
            var sourceFunction = function (query, callback) {
                if (!query || query === "") {
                    return callback(array);
                }
                // HACK: This is a quick hack to migrate
                // from Bootstrap 2 to 3. Actual work should
                // be done on this.
                var matches = [];
                var lowerCaseQuery = query.toLowerCase();
                angular.forEach(array, function (owner) {
                    var lowerCaseOwner = owner.toLowerCase();
                    if (lowerCaseOwner.slice(0, query.length) === lowerCaseQuery) {
                        matches.push(owner);
                    }
                });
                callback(matches);
            };

            var displayKeyFunction = function (obj) {
                return obj;
            };

            var options = {
                hint: true,
                highlight: true,
                minLength: 0
            };
            var dataset = {
                source: sourceFunction,
                displayKey: displayKeyFunction
            };

            elem.typeahead(options, dataset);

            var hack = {
                isKeypressed: false,
                openedVal: undefined
            };

            elem.keypress(function () {
                hack.isKeypressed = true;
            });

            elem.on("typeahead:selected", function (jQuery, suggestion, datasetName) {
                elem.trigger('input');
            });

            elem.on("typeahead:closed", function () {
                // HACK: Why we need this, I have no idea.
                // Otherwise elem.val() is the empty string.
                if (!hack.isKeypressed) {
                    elem.val(hack.openedVal);   
                }
            });
            elem.on("typeahead:opened", function () {
                hack.openedVal = elem.val();
            });

            
            elem.on("typeahead:cursorchanged", function (jQuery, suggestion, datasetName) {
                // This messes up the selection highlight.
                // elem.trigger('input');
            });

            elem.on("typeahead:autocompleted", function (jQuery, suggestion, datasetName) {
                elem.trigger('input');              
            });
        }
    };
});