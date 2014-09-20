'use strict';

function InviteCtrl(lib, session, $scope, $http, $routeParams, errors) {

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
        errors.log(data);
    });

    $scope.showUseExisting = function () {
        $scope.useExisting = true;
        $scope.createNew = false;
    };

    $scope.showCreateNew = function () {
        $scope.useExisting = false;
        $scope.createNew = true;
    };

    var signIn = function (email, password) {
        lib.signIn(email, password, function (err, user) {
            if (err) {
                errors.log(err);
                // TODO: Show error
                return;
            }
            lib.goHome(user, session, function (err) {
                if (err) {
                    errors.log(err);
                    // TODO: Show error
                }
            });
        });
    };

    $scope.createAccount = function (signup) {
        var data = {};
        data.account = signup;
        data.invite = invite;

        $http.post('/data/signup/invite', data)
        .success(function (data) {
            signIn(signup.email, signup.password);
        })
        .error(errors.handle);
    };

    $scope.useAccount = function (account) {
        var data = {};
        data.account = account;
        data.invite = invite;

        $http.post('/data/invite/accept', data)
        .success(function (data) {
            signIn(account.email, account.password);    
        })
        .error(errors.handle);
    };
}
InviteCtrl.$inject = ['lib', 'session', '$scope', '$http', '$routeParams', 'errors'];