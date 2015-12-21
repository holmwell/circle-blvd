'use strict';

function ListsCtrl(lib, session, $scope, $http, $location, $filter, $timeout, errors) {

    var circleId = session.activeCircle;
    var selectedList = undefined;

    $scope.profileName = session.user.name || '';

    if ($scope.showBackBar) {
        $scope.showBackBar();
    }

    $scope.showEntry = function () {
        $scope.isAddingNew = true;
    };

    $scope.hideEntry = function () {
        $scope.isAddingNew = false;
    };

    $scope.createList = function (list) {
        var data = {
            name: list.name,
            description: list.description
        };
        $http.post('/data/' + circleId + '/list', data)
        .success(function (data, status) {
            $scope.hideEntry();
            $scope.newList = undefined;
            updateView();
        })
        .error(errors.handle);
    };

    $scope.showList = function (list) {
        $location.path('lists/' + list._id);
    };


    function updateView() {
        $http.get('/data/' + circleId + '/lists')
        .success(function (data) {
            $scope.isHidingEntry = (data.length === 0);

            // Sort by name ...
            data.sort(function compare (a, b) {
                return a.name.localeCompare(b.name);
            });

            $scope.lists = data;
        })
        .error(errors.log);
    }; 

    updateView();
}
ListsCtrl.$inject = ['lib', 'session', '$scope', '$http', '$location', '$filter', '$timeout', 'errors'];