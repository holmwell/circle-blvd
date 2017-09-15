// This directive allows us to drag and drop
// stories. 
//
// Call 'activate()' on its controller to 
// fire it up. Or send it an "activateDragAndDrop"
// event.
// 
// Relies on the StoryList directive / controller.
//
'use strict';

import errors      from "../errors.js"
import highlighter from "../highlighter.js"
import stories     from "./stories.js"

import Vue from 'vue'
import StoryListBus from "../storyListBus.js"

function $timeout (fn, ms) {
    window.setTimeout(fn, ms);
};

var listId = null;
var circleId = null;

var lib = {
    getStartAndEndOfBlock: function (storyBlock) {
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

        return {
            start: start,
            end: end
        };
    }
}

var getLastStoryId = function () {
    return "last-" + (listId || circleId);
};

var getStoryElement = function (id) {
    return $("[data-story-id='" + id + "']");
};

var isStoryBetween = function (story, start, end) { 
   if (!story) {
      return false;
   }

   if (end.id === story.id) {
      return true;
   }

   // Note: Assumes a valid block, otherwise it is 
   // infinite loop time
   var current = start;
   while (current.id !== end.id) {
      if (current.id === story.id) {
         return true;
      }

      if (current.nextId === getLastStoryId(listId || circleId)) {
         return false;
      }
      current = stories.get(current.nextId)
   }

   return false;
};

export default function (circleIdParam, listIdParam, mindset, isScreenXs) {
    circleId = circleIdParam;
    listId = listIdParam;
    
    var sortableListSelector = "#sortableList";

    var highlightedStories    = highlighter.getHighlightedStories();
    var getStartAndEndOfBlock = lib.getStartAndEndOfBlock;

    var storyListScope = {
        $emit: function (e) {
            console.log(e);
        }
    }

    // This is not really necessary, but it is better for debugging.
    // TODO ... 
    // var storyListScope = storyListCtrl.scope;

    // Used by cb-highlighted-tasks
    // TODO ...
    var scope = {
        $on: function (e) {
            console.log('dnd scope.$on: ' + e);
        }
    } // ...
    scope.isMovingTask = false;

    //-------------------------------------------------------
    // Drag and drop
    //-------------------------------------------------------
    var idAttr = 'data-story-id';
    var preMoveStoryBefore = undefined;
    var preMoveStoryAfter = undefined;
    var preMoveBlockSize = undefined;
    var siblingSelector = '.storyWrapper';

    var getStoryFacadeFromElement = function (el) {
        return {
            id: el.attr(idAttr)
        };
    };


    var getStoryAfter = function (el) {
        var nextElement = $(el).next(siblingSelector);
        if (nextElement !== null && nextElement.attr(idAttr)) {
            return getStoryFacadeFromElement(el.next(siblingSelector));
        }
        else {
            return {
                id: getLastStoryId(listId || circleId)
            };
        }
    };


    var startMove = function (ui) {
        var block = getStartAndEndOfBlock(highlightedStories);
        preMoveBlockSize = highlightedStories.length;

        // It's useful to know the state of things before the move.
        preMoveStoryBefore = 
            stories.getPrevious(block.start, stories.get(block.start.id));
        // TODO: This does NOT work. However, we work around it below.
        // preMoveStoryAfter = getStoryAfter(ui.item);

        if (!preMoveStoryBefore) {
            preMoveStoryBefore = {
                id: "first"
            };
        }

        highlightedStories.forEach(function (story) { 
            var story = stories.get(story.id);
            story.isMoving = true; // TODO: Remove this.
            story.isBeingDragged = true;
        });

        // getStoryAfter(), above, doesn't seem to work 
        // how we want at this point in time.
        var nextStory = stories.get(block.end.nextId);
        if (nextStory) {
            preMoveStoryAfter = { id: nextStory.id };
        }
        else {
            preMoveStoryAfter = { id: getLastStoryId(listId || circleId) };
        }
    };


    var hackRefresh = function () {
        StoryListBus.$emit('rebuild-lists-dnd-hack-force', 'dragAndDrop.js');
    };

    var newDraggable = function () {
        var multidragDataLabel = 'multidrag';
        var selector = '.highlightedWrapper';

        $(sortableListSelector).sortable({
            handle: isScreenXs ? ".grippy" : ".story",
            placeholder: "dragging-row",
            forcePlaceholderSize: true,
            opacity: 0.75,
            tolerance: "pointer",
            scrollSensitivity: 25,
            axis: (mindset === 'roadmap') ? false : "y",
            helper: function (event, item) {
                var highlighted = item.parent().children(selector).clone();

                // Hide highlighted items from the view
                item.siblings(selector).hide();

                var emptyElement = $("<div/>");
                emptyElement.addClass("dragHelper");
                return emptyElement.append(highlighted);
            },
            deactivate: function (event, ui) {
                ui.item.removeClass('moving');

                var block = getStartAndEndOfBlock(highlightedStories);

                if (highlightedStories.length !== preMoveBlockSize) {
                    // So, this can be a thing. For now, just hiccup,
                    // don't do any moves, and hope that peace finds us.
                    console.log("BLOCK SIZES DIFFERENT");
                    hackRefresh();

                    $(selector).show();
                    scope.isMovingTask = false;
                    return;
                }

                var nextStory = getStoryAfter(ui.item);
                
                // And, we're done. Show our work.
                $(selector).show();

                // "Cancel" the sort functionality that jQueryUI.sortable
                // provides, because it is too "helpful" and actually messes
                // everything up, whereas Vue handles everything just fine.
                $(sortableListSelector).sortable("cancel");

                StoryListBus.$emit('move-story-block', block.start, block.end, nextStory);
                //scope.isMovingTask = false;
            },
            start: function (event, ui) {
                ui.item.addClass('moving');
                scope.isMovingTask = true;
                startMove(ui);

                $('.dragging-row').height(highlightedStories.length * 50);
            }
        });

        var mileposts = $('#mileposts');
        if (mileposts.length) {
            mileposts.sortable({
                // This is only a drop target. Tasks
                // cannot be moved.
                cancel: ".storyWrapper",
            });
            $(sortableListSelector).sortable("option", "connectWith", "#mileposts"); 
        }
    };

    scope.$on('keyShiftDown', function () {
        var isDisabled = true;
        $(sortableListSelector).sortable("option", "handle", isDisabled);
    });

    scope.$on('keyShiftUp', function () { 
        $(sortableListSelector).sortable("option", "handle", ".highlighted");
    });

    scope.$on('makeStoriesDraggable', function (e) {
        makeStoriesDraggable();
    });

    var updateUI = function () {
        // Do nothing.
    };

    var makeStoriesDraggable = function () {
        newDraggable();
        updateUI();
    };

    scope.$on('activateDragAndDrop', function () {
        activateDragAndDrop();
    });

    var activateDragAndDrop = function () {
        // Even though we're waiting for viewContentLoaded, 
        // I guess we need to yield to whatever else is happening.
        $timeout(function () {
            makeStoriesDraggable();
        }, 0);
    };

    return {
        activate: activateDragAndDrop
    }
}