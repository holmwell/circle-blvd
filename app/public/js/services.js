'use strict';

/* Services */
angular.module('CircleBlvd.services', []).
  value('version', '0.7.1'). // a simple value service
  factory('hacks', CircleBlvd.Services.hacks).
  factory('signInName', CircleBlvd.Services.signInName).
  factory('session', CircleBlvd.Services.session).
  factory('stories', CircleBlvd.Services.stories).
  factory('errors', CircleBlvd.Services.errors);
