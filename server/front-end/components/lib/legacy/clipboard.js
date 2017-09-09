import highlighter from '../highlighter.js'

// When passed a block of tasks from the
// StoryList, what are the 'start' and
// 'end' tasks in that block?
var lib = {
    getStartAndEndOfBlock: function(storyBlock) {
        var idMap = {};
        var nextMap = {};

        storyBlock.forEach(function (story) {
            idMap[story.id] = story;
            nextMap[story.nextId] = story;
        });

        var start;
        var end;

        storyBlock.forEach(function (story) {
            if (!idMap[story.nextId]) {
                end = story;
            }
            if (!nextMap[story.id]) {
                start = story;
            }
        });

        // If the first clipboard element's next story
        // is also in the clipboard, that means the stories
        // are arranged from top to bottom.
        //
        // If not, they're bottom to top
        // if (map[storyBlock[0].nextId]) {
        //  start = storyBlock[0];
        //  end = storyBlock[storyBlock.length-1];
        // }
        // else {
        //  end = storyBlock[0];
        //  start = storyBlock[storyBlock.length-1];
        // }

        return {
            start: start,
            end: end
        };
    }
};


var clipboard = function () {
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

        highlighter.highlight({
            story: highlightedStory,
            type: 'single'
        });
    }

    function pasteHighlighted(highlightedStories, moveStoryBlock, stories) {
        if (highlightedStories.length === 0 || clipboardStories.length === 0) {
            return;
        }

        var nextStory = highlightedStories.pop();
        nextStory.isMostRecentHighlight = false;
        nextStory.isHighlighted = false;

        var block = lib.getStartAndEndOfBlock(clipboardStories);

        moveStoryBlock(block.start,
            stories.get(block.start.id), 
            stories.get(block.end.id),
            stories.get(nextStory.id));

        clipboardStories.forEach(function (story) {
            story.isInClipboard = false;
            highlightedStories.push(story);
            story.isHighlighted = true;
        });

        reset();
    }

    var copiedTasks = [];
    var setCopiedTasks = function (tasks) {
        copiedTasks = [];
        if (tasks) {
            tasks.forEach(function (task) {
                copiedTasks.push(task);
            });
        }
    };

    var getCopiedTasks = function () {
        return copiedTasks;
    };

    var copyTasks = function (highlightedStories, stories) {
        if (highlightedStories.length === 0) {
            return [];
        }

        var tasks = [];
        var block = lib.getStartAndEndOfBlock(highlightedStories);

        var current = stories.get(block.start.id);
        tasks.push(block.start);

        while (current && current.id !== block.end.id) {
            current = stories.get(current.nextId);
            tasks.push(stories.get(current.id));
        }

        setCopiedTasks(tasks);
        return tasks;
    };

    function reset() {
        clipboardStories = [];
        isActive = false;
    }

    // Initialize data.
    reset();

    return {
        isActive: function () {
            return isActive;
        },
        reset: reset,
        cutHighlighted: cutHighlighted,
        pasteHighlighted: pasteHighlighted,
        copyTasks: copyTasks,
        getCopiedTasks: getCopiedTasks
    }
}();

export default clipboard