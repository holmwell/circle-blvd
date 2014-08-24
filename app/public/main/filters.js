'use strict';

/* Filters */
var isString = function(obj) {
	// from underscore.js
	return toString.call(obj) == '[object String]';
}

angular.module('myApp.filters', []).
  filter('labelify', function () {
    return function (summary) {
        var newSummary = "";
        var words = summary.split(' ');
        words.forEach(function (word) {
            if (word.indexOf('#') === 0) {
                word = "<span class='story-label'>" + word.slice(1) + "</span>";
            }
            word += " ";
            newSummary += word;
        })
        return newSummary;
    }
  }).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]).
  filter('reverse', function() {
    return function (items) {
    	if (!items) {
    		return items;	
    	}

    	return items.slice().reverse();
    };
  }).
  filter('slice', function() {
  	// This is just "limitTo" in the latest version of Angular.
	  return function(input, limit) {
	    if (!angular.isArray(input) && !isString(input)) return input;
	    
	    limit = +limit;

	    if (isString(input)) {
	      //NaN check on limit
	      if (limit) {
	        return limit >= 0 ? input.slice(0, limit) : input.slice(limit, input.length);
	      } else {
	        return "";
	      }
	    }

	    var out = [],
	      i, n;

	    // if abs(limit) exceeds maximum length, trim it
	    if (limit > input.length)
	      limit = input.length;
	    else if (limit < -input.length)
	      limit = -input.length;

	    if (limit > 0) {
	      i = 0;
	      n = limit;
	    } else {
	      i = input.length + limit;
	      n = input.length;
	    }

	    for (; i<n; i++) {
	      out.push(input[i]);
	    }

	    return out;
	  }
  });