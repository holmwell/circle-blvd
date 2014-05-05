'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('parseUrlHack', function() {
  	  // Source: http://jsfiddle.net/bmleite/FyGen/
  	  // Reference: http://stackoverflow.com/questions/14692640/angularjs-directive-to-replace-text
	  var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
	    
	  var normalize = function (arr) {
	  	if (!arr) {
	  		return "";
	  	}

	      var result = {};
	       for (var i = 0, l = arr.length; i < l; i++) {
	          if (!result.hasOwnProperty(arr[i])) {
	             result[arr[i]] = arr[i];
	          }
	       }
	       return result;
	  };
	  
	  return {    
	    restrict: 'A',    
	    require: 'ngModel',
	    replace: true,   
	    // scope: { props: '=parseurl', ngModel: '=ngModel' },
	    scope: { ngModel: '=ngModel' },
	    link: function compile(scope, element, attrs, controller) {
	        scope.$watch('ngModel', function(value) {                     
	            angular.forEach(normalize(value.match(urlPattern)), function(url) {                                    
	                value = value.replace(new RegExp(url, 'g'), '<a href="'+ url + '">' + url +'</a>');     
	            });
	            // This is a hack to prepend whatever is in this block
	            // at the start. (e.g. the name in a comment)
	            element.html(element.html() + value);
	          });                
	    }
	  };  
}).
directive('autosize', function () {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			// Uses: https://github.com/jackmoore/autosize
			elem.autosize();
		}
	};
});
