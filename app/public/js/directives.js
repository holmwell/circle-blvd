'use strict';

/* Directives */
var entityMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': '&quot;',
	"'": '&#39;',
	"/": '&#x2F;'
};

function escapeHtml(string) {
	return String(string).replace(/[&<>"'\/]/g, function (s) {
		return entityMap[s];
	});
}


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
	return function(scope, elm, attrs) {
	  elm.text(version);
	};
  }]).
directive('appendLinky', ['$filter', function ($filter) {
	return {
		restrict: 'A',
		replace: true,
		scope: { ngModel: '=ngModel' },
		link: function (scope, element, attrs, controller) {
			scope.$watch('ngModel', function (value) {
			 	value = $filter('linky')(value);
			 	element.html(element.html() + value);
			});
		}
	};
}]).
directive('autosize', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			// Uses: https://github.com/jackmoore/autosize
			$timeout(function () {
				// If this isn't in a timeout block then it
				// gets fired before things are ready to be
				// resized.
				elem.autosize();
			});
		}
	};
}]).
directive('slider', ['$timeout', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, elem, attr, ctrl) {
			$timeout(function () {
				var width = $(elem.parents(".status")[0]).width() + 'px';
				var Y = scope.sliderY;
				if (Y) {
					var slider = new Y.Slider({
						length: width
					});
					var selector = '#' + attr['id'];
					slider.render(selector);
				}
			}, 100); 
			// TODO: YUI might not load in time.
			// In any case we need a $timeout for 
			// the render to work.
		}
	}
}]).
directive('typeaheadOwners', function () {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			// Uses: https://github.com/twitter/typeahead.js
			var array = scope.owners; 
			var sourceFunction = function (query, callback) {
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
				minLength: 1
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
