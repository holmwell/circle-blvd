'use strict';

function InviteCtrl(inviteId, lib, session, $scope, $http, $window, errors) {

    $scope.hideHeader(); // defined in TopLevelCtrl

    $scope.useExisting = false;
    $scope.createNew = false;

    var isLoading = true;
    var invite = undefined;
    if (!inviteId) {
        return;
    }

    $http.get('/data/invite/' + inviteId)
    .success(function (data, status) {
        invite = data;
        $scope.invite = invite;
        isLoading = false;
    })
    .error(function (data, status) {
        errors.log(data);
        isLoading = false;
    });

    $scope.showUseExisting = function () {
        $scope.useExisting = true;
        $scope.createNew = false;
    };

    $scope.showCreateNew = function () {
        $scope.useExisting = false;
        $scope.createNew = true;
    };

    $scope.isLoading = function () {
        return isLoading;
    };

    $scope.isInviteAvailable = function () {
        var now = Date.now();

        if (!invite) {
            return false;
        }

        if (invite.count <= 0) {
            return false;
        }

        if (invite.expires <= now) {
            return false;
        }

        return true;
    };

    $scope.isInviteAccepted = function () {
        if (!invite) {
            return false;
        }

        if (invite.count <= 0) {
            return true;
        }
    };

    var startSession = function (user) {
        session.activeCircle = invite.circleId;
        session.user = user;
        session.save();

        $window.location.href = "/";
    };

    var handleInviteError = function (data, status) {
        if (status === 403 || status === 404 || status === 400) {
            $scope.message = "Sorry, the invite is no longer available.";
        }
        else {
            // TODO: This does not work on this page, as #errorModal
            // is not defined.
            errors.handle(data, status);
        }
    };

    $scope.createAccount = function (signup) {
        var data = {};
        data.account = signup;
        data.invite = invite;

        $http.post('/data/signup/invite', data)
        .success(function (data) {
            lib.signIn(signup.email, signup.password, function (err, user) {
                if (err) {
                    errors.log(err);
                    $scope.message = "Sorry, our computers are broken. Please try " +
                        "signing in later, and if that doesn't work please contact us.";
                    return;
                }
                startSession(user);
            });
        })
        .error(handleInviteError);
    };

    $scope.useAccount = function (account) {
        var data = {};
        data.account = account;
        data.invite = invite;

        lib.signIn(account.email, account.password, function (err, user) {
            if (err) {
                errors.log(err);
                $scope.message = "Sorry, please try something else.";
                return;
            }

            $http.post('/data/invite/accept', data)
            .success(function (data) {
                startSession(user);
            })
            .error(handleInviteError);
        });
    };
}
InviteCtrl.$inject = ['inviteId', 'lib', 'session', '$scope', '$http', '$window', 'errors'];