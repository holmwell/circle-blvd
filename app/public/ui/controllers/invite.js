'use strict';

function InviteCtrl($scope, $http, $routeParams, errors) {

    $scope.useExisting = false;
    $scope.createNew = false;

    var inviteId = $routeParams.inviteId;
    var invite = undefined;
    if (!inviteId) {
        return;
    }

    $http.get('/data/invite/' + inviteId)
    .success(function (data, status) {
        invite = data;
        $scope.invite = invite;
    })
    .error(function (data, status) {

    });

    $scope.showUseExisting = function () {
        $scope.useExisting = true;
        $scope.createNew = false;
    };

    $scope.showCreateNew = function () {
        $scope.useExisting = false;
        $scope.createNew = true;
    };

    $scope.createAccount = function (signup) {
        var data = {};
        data.account = signup;
        data.invite = invite;

        $http.post('/data/signup/invite', data)
        .success(function (data) {
            console.log("Success");
            // TODO: Sign in.    
        })
        .error(errors.handle);
    };

    $scope.useAccount = function (account) {

    };
}
InviteCtrl.$inject = ['$scope', '$http', '$routeParams', 'errors'];