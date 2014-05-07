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
directive('autosize', function () {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			// Uses: https://github.com/jackmoore/autosize
			elem.autosize();
		}
	};
}).
directive('typeaheadOwners', function () {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			// Uses: http://getbootstrap.com/2.3.2/javascript.html#typeahead
			var array = scope.owners; 
			var options = {
				source: array
			};
			elem.typeahead(options);
		}
	};
});
