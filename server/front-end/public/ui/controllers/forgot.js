'use strict';

function ForgotCtrl(auth, session, $scope, $http) {
    $scope.status = 'pending';

    $http.get('/auth/forgot/' + auth.docId + '/' + auth.secret)
    .success(function (data) {
        $scope.status = 'ok';
    })
    .error(function (data, status) {
        $scope.status = 'failed'
    });
}
ForgotCtrl.$inject = ['auth', 'session','$scope', '$http'];