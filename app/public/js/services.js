'use strict';

/* Services */
angular.module('CircleBlvd.services', []).
  value('version', '0.6.3'). // a simple value service
  factory('signInName', CircleBlvd.Services.signInName).
  factory('session', CircleBlvd.Services.session);
