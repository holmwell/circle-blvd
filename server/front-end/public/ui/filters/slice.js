'use strict';

var isString = function(obj) {
  // from underscore.js
  return toString.call(obj) == '[object String]';
};

angular.module('CircleBlvd.filters').
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