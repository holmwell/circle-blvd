'use strict';

function ListsCtrl(session, $scope, $http, $filter, $timeout, errors) {

    var circleId = session.activeCircle;
    var selectedList = undefined;

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

                $scope.listData = {
                    firstStory: firstStory,
                    allStories: allStories,
                    circleId: circleId,
                    listId: list._id
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

    //
    var parseStory = function (line) {
        var story = {};

        line = line.trim();
        // Parse mileposts
        if (line.indexOf('--') === 0) {
            story.isDeadline = true;
            // Remove all preceding hyphens,
            // so mileposts denoted with '----' 
            // are also possible.
            while (line.indexOf('-') === 0) {
                line = line.substring(1);
            }
            line = line.trim();
        }

        // Parse owners
        var owners = $scope.owners || [];
        var ownerFound = story.isDeadline || false;
        var lowerCaseLine = line.toLowerCase();
        owners.forEach(function (owner) {
            if (ownerFound) {
                return;
            }
            var lowerCaseOwner = owner.toLowerCase();
            // owners start with the @ sign and
            // are at the end of the line
            var ownerIndex = lowerCaseLine.indexOf(lowerCaseOwner);
            if (ownerIndex > 0 
                && line[ownerIndex-1] === '@'
                && line.length === ownerIndex + owner.length) {
                ownerFound = true;
                story.owner = owner;
                line = line.substring(0, ownerIndex-1).trim();
            }
        });

        story.summary = line;
        return story;
    };

    //
    var isCreatingStory = false;
    $scope.create = function (line) {
        if (!isCreatingStory && line) {
            isCreatingStory = true;
            var newStory = parseStory(line);
            insertNewStory(newStory, function () {
                $scope.newStory = undefined;
                isCreatingStory = false;
                $timeout(makeStoriesDraggable, 0);
            }); 
        }
    };


    function updateView() {
        $http.get('/data/' + circleId + '/lists')
        .success(function (data) {
            // Sort by name ...
            data.sort(function compare (a, b) {
                return a.name.localeCompare(b.name);
            });

            $scope.lists = data;

            // Show the first list by default
            if (!selectedList && data.length > 0) {
                $scope.showList(data[0]);
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
ListsCtrl.$inject = ['session', '$scope', '$http', '$filter', '$timeout', 'errors'];