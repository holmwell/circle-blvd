'use strict';

function ListDetailCtrl(lib, session, $scope, $http, $routeParams, $filter, $timeout, errors) {

    var circleId = session.activeCircle;
    var selectedList = undefined;

    $scope.profileName = session.user.name || '';

    if ($scope.showBackBar) {
        $scope.showBackBar({
            url: '/#/lists',
            message: 'Back to checklists'
        });
    }

    $scope.showList = function (list) {
        $http.get('/data/' + circleId + '/' + list._id + '/stories')
        .success(function (allStories, status) {
            $http.get('/data/' + circleId + '/' + list._id + '/first-story')
            .success(function (firstStory) {
                // The account name is not applicable to checklists
                //
                // if ($scope.getAccountName) {
                //     $scope.accountName = $scope.getAccountName();   
                // }
                selectedList = list;
                $scope.listName = list.name;
                $scope.listDescription = list.description;

                $scope.data = {
                    firstStory: firstStory,
                    allStories: allStories,
                    circleId: circleId,
                    listId: list._id
                };

                $scope.isListEmpty = function () {
                    if (!$scope.data.firstStory) {
                        return true;
                    }
                };

                $timeout(makeStoriesDraggable, 0);
            })
            .error(errors.log);
        })
        .error(errors.log);
    };

    //
    var makeStoriesDraggable = function () {
        $scope.$broadcast('makeStoriesDraggable');
    };


    //
    var insertNewStory = function (newStory, callback) {
        $scope.$broadcast('insertNewStory', newStory, callback);
    };

    var parseStory = function (line) {
        return lib.parseStory(line, $scope);
    };

    //
    var isCreatingStory = false;
    $scope.create = function (line) {
        if (!isCreatingStory && line) {
            isCreatingStory = true;
            var newStory = parseStory(line);
            insertNewStory(newStory, function () {
                $scope.isListEmpty = function () {
                    return false;
                };

                $scope.newStory = undefined;
                isCreatingStory = false;
                $timeout(makeStoriesDraggable, 0);
            }); 
        }
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

            // Show the list that we have.
            if ($routeParams.listId) {
                angular.forEach(data, function (list) {
                    if (list._id === $routeParams.listId) {
                        $scope.showList(list);        
                    } 
                })
            }
        })
        .error(errors.log);
    }; 

    function init() {
        $scope.isChecklist = true;

        $http.get("/data/" + circleId + "/members/names")
        .success(function (names) {
            $scope.owners = names;
        })
        .error(errors.log);        
    }

    updateView();
    init();
}
ListDetailCtrl.$inject = ['lib', 'session', '$scope', '$http', '$routeParams', '$filter', '$timeout', 'errors'];