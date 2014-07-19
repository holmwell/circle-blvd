'use strict';

/* Services */
angular.module('CircleBlvd.services', []).
  factory('hacks', CircleBlvd.Services.hacks).
  factory('signInName', CircleBlvd.Services.signInName).
  factory('session', CircleBlvd.Services.session).
  factory('stories', CircleBlvd.Services.stories).
  factory('errors', CircleBlvd.Services.errors);