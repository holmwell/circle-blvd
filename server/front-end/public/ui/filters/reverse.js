'use strict';

angular.module('CircleBlvd.filters').
filter('reverse', function() {
  return function (items) {
      if (!items) {
          return items;   
      }

      return items.slice().reverse();
  };
});