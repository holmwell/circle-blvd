'use strict';

function CreateCircleCtrl($scope, $http, errors) {

    $scope.isCreatingCircle = false;
    $scope.message = undefined;

    $scope.createCircle = function (circleName) {
        if (!circleName || $scope.isCreatingCircle) {
            return;
        }
        $scope.isCreatingCircle = true;

        var finishUp = function () {
            $scope.isCreatingCircle = false;
        };

        var data = {};
        data.name = circleName;
        $http.post("/data/circle/", data)
        .success(function (circle) {
            $scope.message = "Circle created.";
            finishUp();

            var refresh = true;
            // defined in TopLevelCtrl
            $scope.setActiveCircle(circle, refresh);
        })
        .error(function (data, status) {
            finishUp();
            if (status === 403) {
                $scope.message = data;
                return;
            }
            errors.handle(data, status);
        });
    };
}
CreateCircleCtrl.$inject = ['$scope', '$http', 'errors'];