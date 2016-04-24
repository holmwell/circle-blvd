// The story list builder is responsible for adding
// the story list to the view in a reasonble way, one
// that does not overwelm the processing power of the
// client. 
//
'use strict';

angular.module('CircleBlvd.directives')
.directive('cbStoryListBuilder', ['$timeout', 'errors', 
function ($timeout, errors) {

    var buildMilepostList = function (list) {
        var milepostList = [];
        list.forEach(function (story) {
            if (story.isDeadline || story.isNextMeeting) {
                milepostList.push({
                    id: story.id,
                    summary: story.summary,
                    isDeadline: story.isDeadline,
                    isNextMeeting: story.isNextMeeting,
                    isAfterNextMeeting: story.isAfterNextMeeting,
                    isInRoadmap: true
                });
            }
        });

        return milepostList;
    };


    var controller = ['$scope', function ($scope) {
        return {
            buildMilepostList: buildMilepostList
        };
    }];


    var link = function (scope, element, attr, storyListCtrl) {

        var buildStoryList = function (firstStory, serverStories, buildDelay) {
            var stories        = storyListCtrl.stories;
            var storyListScope = storyListCtrl.scope;

            var storiesList = [];

            stories.init(serverStories);
            // Empty list ... 
            if (Object.keys(serverStories).length === 0) {
                storyListScope.stories = storiesList;
                return;
            }

            if (!firstStory) {
                errors.log("The list contains stories but a first story was not specified");
                return;
            }

            stories.setFirst(stories.get(firstStory.id));
            stories.get(firstStory.id).isFirstAtLoad = true;

            if (stories.isListBroken()) {
                storyListScope.$emit('storyListBroken');
                return;
            }

            storyListScope.stories = storiesList;

            // TODO: If we don't have a first story, relax.
            var currentStory = stories.getFirst();
            var isAfterNextMeeting = false;


            var addAndGetNextStory = function (currentStory) {
                storiesList.push(currentStory); // <3 pass by reference 

                if (isAfterNextMeeting) {
                    currentStory.isAfterNextMeeting = true;
                }
                else if (currentStory.isNextMeeting) {                  
                    isAfterNextMeeting = true;
                }

                var nextStoryId = currentStory.nextId;
                if (nextStoryId) {
                    currentStory = stories.get(nextStoryId);
                }
                else {
                    currentStory = undefined;
                }

                return currentStory;
            };


            // Add the first 10 stories immediately, so that
            // the view renders as soon as possible.
            var count = 0;
            while (currentStory) {
                currentStory = addAndGetNextStory(currentStory);
                if (count > 10) {
                    break;
                }
                count++;
            }


            // We build the list slowly by adding elements to the view
            // 10 at a time, so that the UI doesn't lock up while the
            // page is loading. 
            //
            // This means the page will take a full two seconds to load
            // if there are 200 items. We'll want to address this need
            // in the future, but at this point in development, where
            // not many people have large projects, I think this is a 
            // reasonable limitation.
            var buildListSlowly = function () {
                var delay = 100;
                var increment = 10;

                if (typeof(buildDelay) !== undefined) {
                    delay = buildDelay;
                }
     
                $timeout(function () {
                    var count = 0;
                    while (currentStory) {
                        currentStory = addAndGetNextStory(currentStory);
                        if (count > increment) {
                            buildListSlowly();
                            break;
                        }
                        count++;
                    }

                    if (!currentStory) {
                        storyListScope.$emit('storyListBuilt', storiesList);
                    }
                }, delay);
            };

            buildListSlowly();
            
            // For designing
            // storyListScope.select(stories.getFirst());
        };


        scope.$watch('data', function (newVal) {
            if (newVal) {
                buildStoryList(newVal.firstStory, newVal.allStories, newVal.delay);
            }
        });
    };

    return {
        controller: controller,
        link: link,  
        require: '^spStoryList'
    }
}]);