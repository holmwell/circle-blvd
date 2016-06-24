'use strict';

angular.module('CircleBlvd.directives').
directive('typeaheadLabels', function () {
    var isActive = false;
    var activeWordCount = 0;

    return {
        restrict: 'A',
        link: function(scope, elem, attr, ctrl) {
            // Uses: https://github.com/twitter/typeahead.js
            var array = scope.labels; 
            var sourceFunction = function (query, callback) {
                if (!query || query === "") {
                    return callback(array);
                }

                if (!isActive) {
                    callback([]);
                }
                else {
                    callback(array);
                }
                return;

                // HACK: This is a quick hack to migrate
                // from Bootstrap 2 to 3. Actual work should
                // be done on this.
                var matches = [];
                var lowerCaseQuery = query.toLowerCase();
                angular.forEach(array, function (label) {
                    var lowerCaseLabel = label.toLowerCase();
                    //if (lowerCaseLabel.slice(0, query.length) === lowerCaseQuery) {
                        matches.push("#" + label);
                    //}
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

            elem.keypress(function (e) {
                hack.isKeypressed = true;
                // If a # is pressed, activate, and count the number 
                // of hashtags used, and remain active until the 
                // number of hashtags goes down.
                if (e.keyCode === 35) {
                    // # 
                    isActive = true;
                    if (elem.value) {
                        activeWordCount = elem.value.split('#').length;
                    }
                } 
                if (e.keyCode === 32) {
                    // space
                    isActive = false;
                }
                // We don't really need to gate on these keys, specifically.
                // Maybe get rid of this?
                if (e.keyCode === 8 || e.keyCode === 46) {
                    // backspace or delete
                    if (elem.value) {
                        if (elem.value.split('#').length !== activeWordCount) {
                            isActive = false;
                        }
                    }
                    else {
                        activeWordCount = 0;
                        isActive = false;
                    }
                }
            });

            elem.on("typeahead:select", function (jQuery, suggestion) {
                console.log(suggestion);
            });

            elem.on("typeahead:selected", function (jQuery, suggestion, datasetName) {
                console.log(suggestion);
                elem.trigger('input');
            });

            elem.on("typeahead:closed", function () {
                // HACK: Why we need this, I have no idea.
                // Otherwise elem.val() is the empty string.
                if (!hack.isKeypressed) {
                    console.log(hack.openedVal);
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