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

angular.module('CircleBlvd.directives')
.directive('cbDragAndDrop', ['lib', 'mouse', '$timeout', 'errors', 
function (lib, mouse, $timeout, errors) {

    var controller = ['$scope', function ($scope) {
        return {
            activate: function () {
                $scope.$emit("activateDragAndDrop");
            }
        }
    }];

    var link = function (scope, element, attr, storyListCtrl) {
        var highlightedStories        = storyListCtrl.highlightedStories;
        var isStoryBetween            = storyListCtrl.isStoryBetween;
        var getStartAndEndOfBlock     = lib.getStartAndEndOfBlock;
        var stories                   = storyListCtrl.stories;
        var updateViewModelStoryOrder = storyListCtrl.updateViewModelStoryOrder;
        var getLastStoryId            = storyListCtrl.getLastStoryId;
        var getStoryElement           = storyListCtrl.getStoryElement;

        // This is not really necessary, but it is better for debugging.
        var storyListScope = storyListCtrl.scope;

        var circleId = storyListCtrl.getCircleId();
        var listId   = storyListCtrl.getListId();

        // Used by cb-highlighted-tasks
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


        var getStoryBefore = function (el, start, end) {
            var previousElement = el.prev(siblingSelector);

            while (previousElement !== null && previousElement.attr(idAttr)) { 
                var storyBefore = getStoryFacadeFromElement(previousElement);

                if (isStoryBetween(storyBefore, start, end)) {
                    previousElement = previousElement.prev(siblingSelector);
                }
                else {
                    return storyBefore;
                }
            }

            return {
                id: "first"
            };
        };


        var getStoryAfter = function (el) {
            var nextElement = $(el).next(siblingSelector);
            if (nextElement !== null && nextElement.attr(idAttr)) {
                return getStoryFacadeFromElement(el.next(siblingSelector));
            }
            else {
                return {
                    id: getLastStoryId()
                };
            }
        };


        var startMove = function (ui) {
            var block = getStartAndEndOfBlock(highlightedStories);
            preMoveBlockSize = highlightedStories.length;

            // It's useful to know the state of things before the move.
            //preMoveStoryBefore = getStoryBefore(preMoveStoryElement);
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
                preMoveStoryAfter = { id: getLastStoryId() };
            }

            // TODO: Do we have to do these with the new jQuery sortable?
            //Set some styles here
            // drag.get('node').addClass('placeholder-story'); // applied to the storyWrapper

            // drag.get('dragNode').addClass('dragging-row'); // applied to the storyWrapper
            // drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
            // drag.get('dragNode').one('.story').addClass('dragging-story');
        };


        var hackRefresh = function () {
            var hackCircleId   = storyListCtrl.getCircleId();
            var hackListId     = storyListCtrl.getListId();
            var hackFirstStory = stories.getFirst();
            var hackAllStories = stories.all();

            storyListScope.data = null;
            storyListScope.$apply();
            storyListScope.data = {
                circleId: hackCircleId,
                listId: hackListId,
                firstStory: hackFirstStory,
                allStories: hackAllStories,
                delay: 0
            };
            storyListScope.$apply(function () {
                $timeout(function () {
                    makeStoriesDraggable();
                }, 500);    
            });
        };


        var storyNodeMoved = function (ui, item, start, end) {
            var story = getStoryFacadeFromElement(item);
            var storyBefore = getStoryBefore(item, start, end);
            var storyAfter = getStoryAfter(item);

            var startStory = stories.get(start.id);
            var endStory = stories.get(end.id);

            var preMove = {
                storyBefore: stories.get(preMoveStoryBefore.id),
                storyAfter: stories.get(preMoveStoryAfter.id)
            };

            // HACK: So, get the 'storyAfter' from the
            // model, and not the DOM. This is so that
            // we work in roadmap mode.
            //
            // There might be some unintended consequences
            // from this, so be aware.
            var getStoryAfterFromModel = function () {
                var prev = stories.get(storyBefore.id);
                if (!prev) {
                    return stories.getFirst();
                }
                return stories.get(prev.nextId);
            };

            var postMove = {
                storyBefore: stories.get(storyBefore.id),
                // See HACK note, above.
                // storyAfter: stories.get(storyAfter.id)
                storyAfter: getStoryAfterFromModel()
            };

            // console.log("PRE MOVE");
            // console.log(preMove);

            // console.log("POST MOVE");
            // console.log(postMove);

            if (preMove.storyBefore === postMove.storyBefore
            || preMove.storyAfter === postMove.storyAfter
            || isStoryBetween(postMove.storyBefore, startStory, endStory)
            || isStoryBetween(postMove.storyAfter, startStory, endStory)) {
                // We didn't actually move. Do nothing.
                highlightedStories.forEach(function (movedStory) {
                    movedStory.isBeingDragged = false;
                });

                if (storyListScope.isMindset('roadmap')) {
                    // HACK: I can't figure out how to deal with this situation
                    // right now, and I think rebinding the page is better
                    // than leaving an artifact
                    hackRefresh();
                }

                return true;
            }

            var updateModelStoryOrder = function () {
                // If the moved story was the first story, the preMove.storyAfter
                // is now the first story (if it exists).
                if (stories.getFirst().id === start.id && preMove.storyAfter) {
                    stories.setFirst(preMove.storyAfter);
                }

                // We need to update 'nextId' of the following:
                // 1. The story before the moved story, before it was moved.        
                if (preMove.storyBefore) {
                    preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
                }
                
                // 2. The story before the moved story, after it was moved.
                if (postMove.storyBefore) {
                    postMove.storyBefore.nextId = start.id;
                }
                else {
                    // No need to set the "nextId" on the "storyBefore," because 
                    // there isn't one. Instead, we know that the moved story
                    // is now the first story.
                    stories.setFirst(startStory);
                }

                // 3. The last story that was moved, unless it's now the last story.
                endStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();  
            }();
            
            
            try {
                updateViewModelStoryOrder();
            }
            catch (ex) {
                console.log(ex);

                console.log("INTEGRITY ISSUE IN CLIENT");
                console.log("PRE MOVE");
                console.log('Before: ' + preMove.storyBefore.summary);
                console.log('After:  ' + preMove.storyAfter.summary);

                console.log("POST MOVE");
                console.log('Before: ' + postMove.storyBefore.summary);
                console.log('After:  ' + postMove.storyAfter.summary);

                console.log("BLOCK:");
                console.log("Start: " + startStory.summary);
                console.log("End: " + endStory.summary);

                errors.handle("Something unknown happened with the move. Need to refresh page.", "client");

                highlightedStories.forEach(function (movedStory) {
                    movedStory.isBeingDragged = false;
                });
                return false;
            }

            // Without this $timeout, there is a slight delay
            // in facade mode.
            $timeout(function() {
                stories.moveBlock(startStory, endStory, postMove.storyAfter, function (err, response) {
                    if (err) {
                        // We failed. Probably because of a data integrity issue
                        // on the server that we need to wait out. 
                        errors.handle(err.data, err.status);
                        return;
                    }
                    else {
                        if (startStory.id === endStory.id) { 
                            storyListScope.$emit('storyMoved', startStory);
                        } 
                        else {
                            storyListScope.$emit('storyBlockMoved', startStory, endStory);
                        }   
                    }
                });
            }, 0);

            highlightedStories.forEach(function (movedStory) {
                movedStory.isBeingDragged = false;
            });

            return true;
        };

        var checkStoryListDom = function () {
            var current = stories.getFirst();
            var element; 
            while (current && current.nextId !== getLastStoryId()) {
                console.log("...");
                element = getStoryElement(current.id);
                nextElement = element.next(siblingSelector);
                
                next = stories.get(current.nextId);

                if (nextElement.attr('data-story-id') !== next.id) {
                    console.log("DOM INTEGRITY BLAH");
                    return;
                }

                current = next;
            }

            console.log("DONE");
        };

        storyListScope.checkIntegrity = checkStoryListDom;


        var ensureDomIntegrity = function (ui) {
            // This can happen when ui.item is not at the top of
            // the block. 
            var facade = getStoryFacadeFromElement(ui.item);
            var story = stories.get(facade.id);
            var next  = stories.get(story.nextId);

            // Check to make sure the next item in the DOM
            // matches the model.
            var domNext = ui.item.next(siblingSelector);
            // TODO: Sometimes the above lies.

            if (domNext && domNext.attr('data-story-id')) {
                if (next) {
                    var after = getStoryElement(next.id);
                    ui.item.insertBefore(after);
                    console.log("INSERT BEFORE")
                }
                else {
                    console.log("Should never get here. :(");
                }
            }
            else {
                // Need to do this if we're at the bottom of the list
                var prev = stories.getPrevious(story, story);
                if (prev) {
                    var before = getStoryElement(prev.id);
                    ui.item.insertAfter(before);
                    console.log("INSERT AFTER")
                }
            }

            //////////////////////////////////////////////////////////
            $timeout(checkStoryListDom, 200);
        };


        var orderBlockInDom = function (ui, block) {
            // The way we're using jQuery UI is pretty fragile, and
            // things will mess up if the drop target is not in the 
            // list.
            //
            // Recover from this situation.
            // console.log("Ordering block ...");
            var startElement = getStoryElement(block.start.id);
            var nextElement;
            var element;

            var current = stories.getPrevious(block.start, stories.get(block.start.id));

            while (current && current.id !== block.end.id) {
                // console.log(current.summary);
                element = getStoryElement(current.id);
                nextElement = getStoryElement(current.nextId);
                if (nextElement) {
                    nextElement.insertAfter(element);
                }
                current = stories.get(current.nextId);
            }
        };


        var newDraggable = function () {
            var multidragDataLabel = 'multidrag';
            var selector = '.highlightedWrapper';

            $('#sortableList').sortable({
                // handle: ".grippy", Do some more testing on mobile before eliminating
                // the use of grippy entirely.
                handle: ".highlighted",
                placeholder: "dragging-row",
                forcePlaceholderSize: true,
                opacity: 0.75,
                tolerance: "pointer",
                scrollSensitivity: 25,
                axis: storyListScope.isMindset('roadmap') ? false : "y",
                helper: function (event, item) {
                    var highlighted = item.parent().children(selector).clone();

                    // Hide highlighted items from the view
                    item.siblings(selector).hide();

                    var emptyElement = $("<div/>");
                    emptyElement.addClass("dragHelper");
                    return emptyElement.append(highlighted);
                },
                deactivate: function (event, ui) {
                    // ui.item.removeClass('dragging');
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

                    var success = storyNodeMoved(ui, ui.item, block.start, block.end);
                    // At this point, the server, model and view model
                    // are correct, but it is possible that the DOM is 
                    // out of order.
                    // ensureDomIntegrity(ui);
                    if (success && !storyListScope.isMindset('roadmap')) {
                        orderBlockInDom(ui, block);
                    }

                    // And, we're done. Show our work.
                    $(selector).show();
                    scope.isMovingTask = false;
                },
                start: function (event, ui) {
                    // The drop shadow slows down the phones a bit
                    // ui.item.addClass('dragging');
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
                $("#sortableList").sortable("option", "connectWith", "#mileposts"); 
            }
        };

        scope.$on('keyShiftDown', function () {
            var isDisabled = true;
            $("#sortableList").sortable("option", "handle", isDisabled);
        });

        scope.$on('keyShiftUp', function () { 
            $("#sortableList").sortable("option", "handle", ".highlighted");
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
    };

    return {
        link: link,
        controller: controller,
        require: '^spStoryList'
    }
}]);