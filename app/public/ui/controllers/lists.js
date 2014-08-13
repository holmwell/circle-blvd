'use strict';

function ListsCtrl(session, $scope, $http, $filter, errors) {

    var circleId = session.activeCircle;

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

    function updateView() {
        $http.get('/data/' + circleId + '/lists')
        .success(function (data) {
            $scope.lists = data;
        })
        .error(errors.log);
    }; 

    updateView();
}
ListsCtrl.$inject = ['session', '$scope', '$http', '$filter', 'errors'];