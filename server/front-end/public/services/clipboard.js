'use strict';

angular.module('CircleBlvd.services')
.factory('clipboard', function () {
    
    var isActive = false;
    var clipboardStories = [];

    var isHighlightingUp = function (highlightedStories, stories) {
        // Determine the direction of the current highlight.
        // If the most recently highlighted story's next story
        // is highlighted, that means we're moving up.
        if (highlightedStories.length <= 1) {
            return false;
        }

        var lastHighlighted = highlightedStories[highlightedStories.length-1];
        var nextStory = stories.get(lastHighlighted.nextId);
        if (!nextStory) {
            return false;
        }

        return nextStory.isHighlighted;
    };


    function cutHighlighted(highlightedStories, stories) {
        if (clipboardStories.length > 0 || highlightedStories.length === 0) {
            return;
        }

        highlightedStories.forEach(function (story) {
            // TODO: Put in order? Maybe.
            story.isInClipboard = true;
            isActive = true;
            clipboardStories.push(story);
        });

        // Only highlight the top-most story
        var highlightedStory;
        if (isHighlightingUp(highlightedStories, stories)) { 
            highlightedStory = highlightedStories[highlightedStories.length-1];
        }
        else {
            highlightedStory = highlightedStories[0];
        }

        highlightedStories.unhighlightAll();
        highlightedStory.isHighlighted = true;
        highlightedStories.push(highlightedStory);
    }

    function pasteHighlighted(highlightedStories, getStartAndEndOfBlock, moveStoryBlock, stories) {
        if (highlightedStories.length === 0 || clipboardStories.length === 0) {
            return;
        }

        var nextStory = highlightedStories.pop();
        nextStory.isHighlighted = false;

        var block = getStartAndEndOfBlock(clipboardStories);

        moveStoryBlock(block.start,
            stories.get(block.start.id), 
            stories.get(block.end.id),
            stories.get(nextStory.id));

        clipboardStories.forEach(function (story) {
            story.isInClipboard = false;
            highlightedStories.push(story);
            story.isHighlighted = true;
        });
        clipboardStories = [];
        isActive = false;
    }


    return {
        isActive: function () {
            return isActive;
        },
        cutHighlighted: cutHighlighted,
        pasteHighlighted: pasteHighlighted
    }
});