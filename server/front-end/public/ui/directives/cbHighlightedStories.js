// Highlighted stories are a subset of what's
// in the story list, selected by a person
// who wants to highlight a continuous block
// of stories.
//
'use strict';

angular.module('CircleBlvd.directives')
.directive('cbHighlightedStories', ['mouse', 
function (mouse) {
    var highlightedStories = [];

    // Properties we get from StoryList during 
    // the link step.
    var stories = function () {
        return {};
    };
    var isClipboardActive = function () {
        return false;
    };

    var controller = ['$scope', function ($scope) {
        //
        var isMouseAboveFirstHighlight = function () {
            if (!mouse.dragStartPoint || !mouse.position) {
                return false;
            }

            if (mouse.dragStartPoint.y > mouse.position.y) {
                return true;
            }
            return false;
        };


        // API: unhighlightAll
        var unhighlightAllStories = function () {
            while (highlightedStories.length > 0) {
                var story = highlightedStories.pop();
                story.isHighlighted = false;
                // TODO: This is a bit fragile ... should
                // wrap the highlight methods soon.
                story.highlightedFrom = 'none';
                $scope.$broadcast('storyUnhighlighted', story);
            }
        };


        // API: highlight
        var highlightStory = function (story, highlightType) {
            if (highlightType === 'single') {
                // Only allow one story to be highlighted.
                unhighlightAllStories();    
            }

            // From cbDragAndDrop
            if ($scope.isMovingTask) {
                return;
            }

            var highlight = function (storyToHighlight) {
                if (!storyToHighlight) {
                    return;
                }
                storyToHighlight.isHighlighted = true;
                storyToHighlight.highlightedFrom = mouse.direction;
                highlightedStories.push(storyToHighlight);
                
                $scope.$emit('storyHighlighted', storyToHighlight);
                $scope.$broadcast('storyHighlighted', storyToHighlight);
            };

            if (highlightedStories.length === 0) {
                highlight(story);
                return;
            }

            if (story.isHighlighted)
                return;

            // Account for the mouse leaving and re-entering
            // the list during a drag. Also makes fast drags
            // work, if they're going in one direction
            if (!isMouseAboveFirstHighlight()) {
                var current = highlightedStories[highlightedStories.length-1];

                while (current && current.id !== story.id) {
                    current = stories().get(current.nextId);
                    highlight(current);
                }
            }
            else {
                var current = highlightedStories[highlightedStories.length-1];

                while (current && current.id !== story.id) {
                    current = stories().getPrevious(current, stories().get(current.id));
                    highlight(current);
                }
            }
        };
          

        // API: unhighlight
        var unhighlightStory = function (story, direction) {
            if (highlightedStories.length <= 1) {
                return;
            }
            
            var unhighlight = function () {
                var indexToRemove = -1;
                highlightedStories.forEach(function (highlighted, index) {
                    if (highlighted.id === story.id) {
                        indexToRemove = index;
                    }
                });

                // Remove everything after the unhighlighted story.
                // This helps us recover if a mouse-leave event isn't
                // handled in order or something.
                var count = highlightedStories.length-indexToRemove

                if (indexToRemove >= 0) {
                    var removedStories = highlightedStories.splice(indexToRemove, count);
                    removedStories.forEach(function (removedStory) {
                        removedStory.isHighlighted = false;
                        removedStory.highlightedFrom = 'none';
                        $scope.$broadcast('storyUnhighlighted', removedStory);
                    });
                }
            }

            if (isMouseAboveFirstHighlight() && direction === 'down') {
                unhighlight();
            }
            else if (!isMouseAboveFirstHighlight() && direction === 'up') {
                unhighlight();
            }
        };

        var isMostRecent = function (story) {
            if (highlightedStories.length === 0) {
                return false;
            }

            var mostRecent = highlightedStories[highlightedStories.length-1];
            if (mostRecent.id === story.id) {
                return true;
            }
            return false;
        };

        // API: Used by other directives
        highlightedStories.highlight      = highlightStory;
        highlightedStories.unhighlight    = unhighlightStory;
        highlightedStories.unhighlightAll = unhighlightAllStories;
        highlightedStories.isMostRecent   = isMostRecent;

        return highlightedStories;
    }];


    var link = function (scope, element, attr, storyListCtrl) {
        // Inherited scope
        var keyboard      = scope.keyboard;
        // From our parent StoryList
        var shouldHideStory = storyListCtrl.shouldHideStory;
        var scrollToStory   = storyListCtrl.scrollToStory;

        var selectedStory;
        scope.$on("storySelected", function (e, story) {
            selectedStory = story;
        });
        scope.$on("storyDeselected", function () {
            selectedStory = undefined;
        });
        scope.$on("storyRemoved", function () {
            selectedStory = undefined;
        });

        // TODO: Is this the best we can do, setting
        // these properties of storyListCtrl to local
        // functions at link time? 
        stories = function () {
            return storyListCtrl.stories;
        };
        isClipboardActive = function () {
            return scope.isClipboardActive;
        }

        // Pass the highlightedStories down to our scope children
        scope.highlightedStories = highlightedStories;

        // TODO: Where should this be?
        var isShiftDown = function () {
            var is = keyboard && keyboard.isShiftDown && !isClipboardActive();
            return is;
        };


        // TODO: Refactor this junk
        scope.$on('keyDownArrow', function (e, event) {
            if (selectedStory || highlightedStories.length === 0) {
                return;
            }

            // If the shift key is pressed, add to the selection, 
            // otherwise ... 
            var recentStory;
            if (isShiftDown()) {
                var lastHighlighted = highlightedStories[highlightedStories.length-1];
                var nextStory = stories().get(lastHighlighted.nextId);

                if (!nextStory) {
                    return;
                }

                if (nextStory.isHighlighted) {
                    // Highlighting up
                    var storyToUnhighlight = highlightedStories.pop();
                    storyToUnhighlight.isHighlighted = false;

                    // Stop the window from the scrolling, and then scroll
                    // to the highlighted story
                    event.preventDefault();
                    var preventOpening = true;
                    var delay = 0;
                    // TODO: .... this is in StoryList
                    scrollToStory(storyToUnhighlight.id, preventOpening, delay);
                    return;
                }
                else {
                    // Highlighting down
                    recentStory = highlightedStories[highlightedStories.length-1];
                }
            }
            else {
                // Shift is not down.
                // Move the highlighted story down one visible story
                recentStory = highlightedStories.pop();
                recentStory.isHighlighted = false;
                highlightedStories.unhighlightAll();
            }

            var nextStory = stories().get(recentStory.nextId);
            //TODO: highlight blocks + labels
            while (nextStory && shouldHideStory(nextStory)
                || (isClipboardActive() && nextStory && nextStory.isInClipboard)) {
                nextStory = stories().get(nextStory.nextId);
            }

            if (nextStory) {
                nextStory.isHighlighted = true;
                highlightedStories.push(nextStory);
                scope.$emit('storyHighlighted', nextStory);

                // Stop the window from the scrolling, and then scroll
                // to the highlighted story
                event.preventDefault();
                var preventOpening = true;
                var delay = 0;
                // TODO: 
                scrollToStory(recentStory.id, preventOpening, delay);
            }
            else if (isShiftDown()) {
                // Do nothing. We're at the bottom and shift is down.
            }
            else {
                // Revert if we're at the bottom
                recentStory.isHighlighted = true;
                highlightedStories.push(recentStory);
                scope.$emit('storyHighlighted', recentStory);
            }
        });


        scope.$on('keyUpArrow', function (e, event) {
            // TODO: scope.selectedStory
            if (selectedStory || highlightedStories.length === 0) {
                return;
            }

            if (isShiftDown()) {
                // TODO: What happens when a label filter is applied to the list?
                var lastHighlighted = highlightedStories[highlightedStories.length-1];
                var previousStory = 
                    stories().getPrevious(lastHighlighted, stories().get(lastHighlighted.id));

                if (!previousStory) {
                    return;
                }

                if (previousStory.isHighlighted) {
                    // Highlighting down
                    var storyToUnhighlight = highlightedStories.pop();
                    storyToUnhighlight.isHighlighted = false;
                }
                else {
                    // Highlighting up
                    previousStory.isHighlighted = true;
                    highlightedStories.push(previousStory);
                    scope.$emit('storyHighlighted', previousStory);
                }

                event.preventDefault();
                var preventOpening = true;
                var delay = 0;
                var isMovingUp = true;
                scrollToStory(previousStory.id, preventOpening, delay, isMovingUp);
            }
            else {
                // Move the highlighted story up one visible story
                var story = highlightedStories.pop();
                story.isHighlighted = false;
                highlightedStories.unhighlightAll();

                var previousStory = stories().getPrevious(story, stories().get(story.id));
                while (previousStory && 
                    (shouldHideStory(previousStory) || 
                        (isClipboardActive() && previousStory && previousStory.isInClipboard)
                    )
                ) {
                    previousStory = stories().getPrevious(previousStory, previousStory);
                }

                if (previousStory) {
                    previousStory.isHighlighted = true;
                    highlightedStories.push(previousStory);
                    scope.$emit('storyHighlighted', previousStory);

                    // Stop the window from scrolling, and then scroll
                    // to the highlighted story
                    event.preventDefault();
                    var preventOpening = true;
                    var delay = 0;
                    var isMovingUp = true;
                    scrollToStory(story.id, preventOpening, delay, isMovingUp);
                }
                else {
                    // Revert if we're at the top
                    story.isHighlighted = true;
                    highlightedStories.push(story);
                    scope.$emit('storyHighlighted', story);
                }
            }
        });
    };

    return {
        link: link,
        controller: controller,
        require: '^spStoryList'
    };

}]);