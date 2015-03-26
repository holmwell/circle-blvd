'use strict';

function RemoveHashCtrl($location, $window) {
    var path = $location.path();

    if ($window.location.hash.length > 0) {
        $window.location.href = path;
    }
}
RemoveHashCtrl.$inject = ['$location', '$window'];