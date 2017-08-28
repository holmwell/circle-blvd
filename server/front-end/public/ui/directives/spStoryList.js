//'use strict';

angular.module('CircleBlvd.directives').
directive('spStoryList', ['$timeout', '$http', '$location', '$route', 'mouse', 'lib', 'clipboard', 'hacks', 'errors', 
function ($timeout, $http, $location, $route, mouse, lib, clipboard, hacks, errors) {
    var shared = {};

    var directive = {
        require: [
            'cbHighlightedStories', 
            'cbDragAndDrop', 
            'cbStoryListBuilder'
        ],
        restrict: 'E',
        templateUrl: 'ui/views/storyList.html',
        scope: {
            data: '=',
            accountName: '=',
            owners: '=',
            enableAltMode: '=',
            mindset: '=',
            isFacade: '=',
            isChecklist: '=',
            isSearching: '=',
            keyboard: '=',
            mouse: '='
        },
        controller: ['$scope', function ($scope) {
            return shared;
        }],
        link: link
    };

    function link (scope, element, attr, controllers) {
        var highlightedStories = controllers[0];
        var dragAndDrop        = controllers[1];
        var storyListBuilder   = controllers[2];

        var circle = undefined;
        var circleId = undefined;
        var listId = undefined;

        var selectedStory = undefined;
        var storiesList   = [];
        var stories       = CircleBlvd.Services.stories($http);
        
        shared.stories    = stories;

        var isFacade = false;
        var isChecklist = false;
        var searchEntry = undefined;

        var selectedOwner = undefined;
        scope.selectedOwner = selectedOwner;

        var selectedLabels = [];
        scope.selectedLabels = selectedLabels;

        var teamHighlightedStories = {};

        var storyBeingInserted = undefined;


        // TODO: Possibly make it so this isn't just on page load
        var visibilityHelper = $('#visibilityHelper');
        if (visibilityHelper.is(':hidden')) {
            scope.isScreenXs = true;
        }
        else {
            scope.isScreenXs = false;
        }

        var buildMilepostList = function (list) {
            var mileposts = storyListBuilder.buildMilepostList(list);
            scope.mileposts = mileposts;
        };

        var findNextMeeting = function () {
            return stories.find(function (story) {
                return story.isNextMeeting;
            });
        };

        var pulse = function (story) {
            // With the introduction of Vue, Vue is a lot faster
            // than Angular, so oftentimes this event will fire
            // before the UI is ready, so put a little delay in
            // there to make things display.
            $timeout(function () {
                scope.$emit('pulseStory', story);
            }, 100);
        };

        var scrollToAndPulse = function (story) {
            scope.$emit('scrollToAndPulseStory', story);
        };

        scope.$watch('data', function (newVal) {
            if (newVal) {
                circle = newVal.circle;
                circleId = newVal.circleId;
                listId = newVal.listId || undefined;
                // Note, the storyListBuilder also watches
                // on this property, and ultimately leads
                // to binding scope.stories to something,
                // via the storyListBuilt event.
            }
            else {
                circle = undefined;
                circleId = undefined;
                listId = undefined;
                scope.stories = [];
                scope.mileposts = [];
            }
        });

        // Emitted by storyListBuilder
        scope.$on('storyListBuilt', function (e, newStoriesList) {
            storiesList = newStoriesList;

            scope.$broadcast('viewportChanged');
            buildMilepostList(storiesList);
            scope.nextMeeting = findNextMeeting();

            clipboard.reset();
            scope.isClipboardActive = clipboard.isActive();

            dragAndDrop.activate();
        });

        scope.$on('keyEnter', function (e) {
            if (highlightedStories.length === 0) {
                return 0;
            }
            // Open / select the highlighted story
            var story = highlightedStories[0];

            scope.$emit('beforeStorySelected', story);
            story.isSelected = true;
            scope.$emit("storySelected", story);
        });

        scope.$on('keyEscape', function (e) {
            if (scope.isShowingInsertStory) {
                scope.hideInsertStory();
                // Keep selection
                return;
            }

            if (selectedStory) {
                // Close / deselect the story
                // TODO: Revert changes to the story, which needs
                // to happen when 'hide details' is clicked, too.
                selectedStory.isSelected = false;
                scope.$emit('storyDeselected', selectedStory);         
            }
            else if (!clipboard.isActive()) {
                highlightedStories.unhighlightAll();
            }
            // TODO: Un-cut the things.
        });

        scope.mouseLeave = function (story) {
            
        };

        scope.cutHighlighted = cutHighlighted;
        scope.pasteHighlighted = pasteHighlighted;

        function cutHighlighted() {
            clipboard.cutHighlighted(highlightedStories, stories);
            scope.isClipboardActive = clipboard.isActive();
        }

        function pasteHighlighted() {
            clipboard.pasteHighlighted(highlightedStories, 
                moveStoryBlock,
                stories);

            for (var index in storiesList) {
                storiesList[index].isMostRecentHighlight = false;
            }
            if (highlightedStories.length > 0) {
                highlightedStories[0].isMostRecentHighlight = true;
            }

            scope.isClipboardActive = clipboard.isActive();
        }

        scope.$on('keyCut', function (e, event) {
            cutHighlighted();
            event.preventDefault();
        });

        scope.$on('keyPaste', function (e, event) {
            pasteHighlighted();
            event.preventDefault();
        });

        scope.$on('keyCopy', function (e, event) {
            var tasks = clipboard.copyTasks(highlightedStories, stories);
            tasks.forEach(function (story) {
                pulse(story);
            });
        });

        scope.$on('keyDone', function (e, event) {
            scope.markHighlightedAs('done');
        });

        scope.$on('keyAssigned', function (e, event) {
            scope.markHighlightedAs('assigned');
        });

        scope.$on('keyActive', function (e, event) {
            scope.markHighlightedAs('active');
        });

        scope.$on('keyClearStatus', function (e) {
            scope.markHighlightedAs('');
        });

        scope.$on('keyTakeOwnership', function (e) {
            var owner = scope.accountName; 
            scope.setOwnerForHighlighted(owner);
        });

        scope.$on('mouseLeave', function () {
            // If the guest is moving things quickly, sometimes letting go
            // of the mouse outside the window can be a thing, which messes
            // up our shared state -- which is a bad idea anyway, and this
            // is one reason why, but so it goes.
            mouse.isHighlighting = false;
        })
     
        scope.markHighlightedAs = function (newStatus) {
            highlightedStories.forEach(function (story) {
                if (story.isDeadline || story.isNextMeeting) {
                    return;
                }

                if (story.status !== newStatus) {
                    story.status = newStatus;
                    scope.$emit('storyChanged', story);
                }
            });
        };

        scope.setOwnerForHighlighted = function (owner) {
            highlightedStories.forEach(function (story) {
                if (story.isDeadline || story.isNextMeeting) {
                    return;
                }

                // Only emit a changed event if we have to.
                if (story.owner !== owner) {
                    story.owner = owner;
                    if (!story.status) {
                        story.status = "assigned";
                    }
                    scope.$emit('storyChanged', story);
                }
                else {
                    // We already own it. In that case, mark it
                    // as assigned
                    if (!story.status) {
                        story.status = "assigned";
                        scope.$emit('storyChanged', story);
                    }
                }
            });
        };

        scope.isExactlyOneHighlighted = function () {
            if (highlightedStories.length === 1) {
                return true;
            }
            return false;
        };

        scope.isMostRecentlyHighlighted = function (story) {
            return highlightedStories.isMostRecent(story);
        };

        scope.$on('keyInsertStory', function () {
            scope.showInsertStory();
        });

        scope.showInsertStory = function () {
            scope.isShowingInsertStory = true;
            $timeout(function () {
                hacks.focus('storyInsert');
            }, 0);
            // scope.$emit('show-entry');
        };

        scope.hideInsertStory = function () {
            scope.isShowingInsertStory = false;
            scope.$emit('hide-entry');
        };

        var insertNewStory = function (newStory, callback) {
            scope.$broadcast('insertNewStory', newStory, callback);
        };

        var makeStoriesDraggable = function () {
            scope.$broadcast('makeStoriesDraggable');
        };

        var isInsertingStory = false;
        scope.insertedStory = {};
        scope.insertStory = function (story, nextStory, callback) {
            if (!isInsertingStory && story && story.summary) {
                isInsertingStory = true;
                var newStory = lib.parseStory(story.summary, scope);

                newStory.description = story.description;
                if (!newStory.isDeadline) {
                    newStory.isDeadline = story.isDeadline;
                }
                
                // Insert the story at the top and then move
                // it down. Feel free to implement a new API
                // call that inserts directly into the list
                // at the correct spot, but this works for
                // the time being (and works with the io
                // engine).
                insertNewStory(newStory, function (story) {

                    var storyToMove = stories.get(story.id);
                    moveStory(story, storyToMove, nextStory);

                    scope.insertedStory = {};
                    isInsertingStory = false;

                    callback && callback();
                }); 
            }
        };

        scope.$on('beforeStorySelected', function (e) {
            // Deselect the story that was selected previously
            if (selectedStory) {
                selectedStory.isSelected = false;
            }
        });

        scope.$on('storySelected', function (e, story) {
            selectedStory = story;
            // TODO: Where should this go, really? 
            if (story.warning) {
                delete story.warning;
            }
            if (scope.isStoryHighlightedByTeam(story)) {
                story.warning = teamHighlightedStories[story.id] + " is also looking at this task.";
            }


            if (!scope.isScreenXs) {
                // Bring the focus to the default input box, 
                // which is likely the summary text.
                //
                // We do need this timeout wrapper around focus
                // for this to work, for whatever reason.
                //
                // This behavior is annoying on phones, so don't do
                // that. TODO: Detect tablets too and don't do it.
                $timeout(function () {
                    var boxId = "boxForStory" + story.id;
                    hacks.focus(boxId);
                });         
            }
        });


        scope.$on('storyDeselected', function (e, story, event) {
            selectedStory = undefined;
            pulse(story);
            // TODO: This was scrollToAndPulse, and I'm not sure
            // why. It possibly needs to do this in certain situations.
            // scrollToAndPulse(story);
        });

        scope.$on('storyHighlight', function (e, id, type) {
            highlightedStories.highlight(stories.get(id), type);
        });

        function insertNewStoryIntoViewModel (serverStory) {
            // add the new story to the front of the backlog.
            storiesList.unshift(serverStory);
            if (serverStory.isDeadline) {
                buildMilepostList(storiesList);
            }
        }

        // Called when the entry panel receives a new story.
        scope.$on('insertNewStory', function (e, newStory, callback) {
            storyBeingInserted = newStory;
            stories.insertFirst(newStory, circleId, listId, function (err, serverStory) {
                insertNewStoryIntoViewModel(serverStory);

                $timeout(function () {
                    scope.$broadcast('pulseStory', serverStory);
                }, 50);

                if (callback) {
                    callback(serverStory);
                }
            });
        });

        var isStoryBetween = function (story, start, end) { 
            if (!story) {
                return false;
            }

            if (end.id === story.id) {
                return true;
            }

            // TODO: Assumes a valid block, otherwise it is 
            // infinite loop time
            var current = start;
            while (current.id !== end.id) {
                if (current.id === story.id) {
                    return true;
                }

                if (current.nextId === getLastStoryId()) {
                    return false;
                }
                current = stories.get(current.nextId)
            }

            return false;
        };

        function moveStoryBlock (uiStartStory, startStory, endStory, nextStory, isLocalOnly) {
            var storyToMove = startStory;

            if (startStory.id === nextStory.id 
                || startStory.nextId === nextStory.id
                || endStory.id === nextStory.id
                || endStory.nextId === nextStory.id
                || isStoryBetween(nextStory, startStory, endStory)) {
                // Do nothing.
                // console.log('start ' + startStory.id);
                // console.log('start.next ' + startStory.nextId)
                // console.log('end   ' + endStory.id);
                // console.log('next  ' + nextStory.id);
                return;
            }

            // Update data model
            // TODO: Refactor, to share the same code used
            // in the drag and drop module.
            var preMove = {
                storyBefore: stories.getPrevious(uiStartStory, startStory),
                storyAfter: stories.get(endStory.nextId)
            };

            var postMove = {
                storyBefore: stories.getPrevious(nextStory, nextStory),
                storyAfter: nextStory
            };

            // If the moved story was the first story, the preMove.storyAfter
            // is now the first story (if it exists).
            if (stories.getFirst().id === startStory.id && preMove.storyAfter) {
                stories.setFirst(preMove.storyAfter);
            }

            // We need to update 'nextId' of the following:
            // 1. The story before the moved story, before it was moved.        
            if (preMove.storyBefore) {
                preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
            }

            // 2. ...
            if (postMove.storyBefore) {
                postMove.storyBefore.nextId = startStory.id;
            }
            else {
                stories.setFirst(startStory);   
            }
            
            // 3. ...
            endStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();

            // Update view model
            try { 
                updateViewModelStoryOrder();
            }
            catch (ex) {
                errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
                return;
            }

            // ...
            $timeout(function () {
                pulse(startStory);
            }, 100);

            if (isLocalOnly) {
                return;
            }

            // Update server
            $timeout(function() {
                stories.moveBlock(startStory, endStory, nextStory, function (err, response) {
                    if (err) {
                        // We failed. Probably because of a data integrity issue
                        // on the server that we need to wait out. 
                        errors.handle(err.data, err.status);
                        return;
                    }
                    else {
                        if (startStory.id === endStory.id) { 
                            scope.$emit('storyMoved', startStory);
                        } 
                        else {
                            scope.$emit('storyBlockMoved', startStory, endStory);
                        }           
                    }
                });
            }, 0);
        }

        function moveStory (uiStory, storyToMove, nextStory) {
            moveStoryBlock(uiStory, storyToMove, storyToMove, nextStory);
        }

        scope.$on('storyMovedToTop', function (e, story) {
            e.stopPropagation();
            e.preventDefault();

            var storyToMove = stories.get(story.id);
            var nextMeeting = findNextMeeting();

            moveStory(story, storyToMove, nextMeeting);
        });

        var removeFromView = function (viewStory, serverStory, shouldAnimate) {

            var nextStory = stories.get(serverStory.nextId);

            if (viewStory.isSelected) {
                viewStory.isSelected = false;
                selectedStory = undefined;
            }

            if (stories.isListBroken()) {
                scope.$emit('storyListBroken');
                return;
            }

            var previousStory = stories.getPrevious(viewStory, serverStory);
            if (!previousStory) {
                stories.setFirst(nextStory);
            }
            else {
                previousStory.nextId = nextStory ? nextStory.id : getLastStoryId();
            }

            function actuallyRemove() {
                var storyIndex = storiesList.indexOf(viewStory);
                storiesList.splice(storyIndex, 1);
                stories.remove(viewStory.id);

                // Update the view model
                if (viewStory.isDeadline) {
                    buildMilepostList(storiesList);
                }
            }

            if (shouldAnimate) {
                getStoryElement(viewStory.id).fadeOut(actuallyRemove);
            }
            else {
                actuallyRemove();
            }
            

            // TODO: Do we need this for 'remove'?
            // $timeout(makeStoriesDraggable, 0);
        };

        // Refactor: Move all these save operations in
        // their own directive.
        scope.$on('storyArchived', function (e, story) {
            // Checklists can't be archived for now.
            if (isChecklist) {
                return;
            }

            var storyToArchive = stories.get(story.id);
            removeFromView(story, storyToArchive);
            
            // Facades give the impression that the story
            // has gone into the archives.
            if (isFacade) {
                return;
            }

            $http.put('/data/story/archive', storyToArchive)
            .success(function (data) {
                // nbd.
            })
            .error(function (data, status) {
                errors.handle(data, status);
            });
        });

        scope.$on('storyRemoved', function (e, story) {
            // TODO: Sometimes all the stories after the
            // removed story are no longer shown, but the
            // data is fine on the server so a refresh 
            // takes care of everything. Look into this data
            // display issue.
            var storyToRemove = stories.get(story.id);
            removeFromView(story, storyToRemove);
            
            if (isFacade) {
                return;
            }

            $http.put('/data/story/remove', storyToRemove)
            .success(function (data) {
                // nbd.
            })
            .error(function (data, status) {
                errors.handle(data, status);
            });
        });

        scope.$on('storySaved', function (e, story) {
            var storyToSave = stories.get(story.id);
            
            // Parse labels out of story.summary
            story.labels = [];
            var words = story.summary.split(lib.consts.LabelRegex);

            words.forEach(function (word) {
                word = word.trim();
                if (word.indexOf('#') === 0) {
                    story.labels.push(word.slice(1));
                }
            });

            // TODO: We can probably just have this on the 
            // server side, but it's nice to have clean
            // traffic I guess.
            storyToSave.summary = story.summary;
            storyToSave.owner = story.owner;
            storyToSave.status = story.status;
            storyToSave.description = story.description;
            storyToSave.labels = story.labels;

            storyToSave.newComment = story.newComment;
            
            stories.set(story.id, storyToSave, function (savedStory) {
                story.newComment = undefined;
                story.comments = savedStory.comments;
                story.isOwnerNotified = savedStory.isOwnerNotified;
            });

            if (storyToSave.isDeadline || storyToSave.isNextMeeting) {
                scope.mileposts.forEach(function (milepost) {
                    if (storyToSave.id === milepost.id) {
                        milepost.summary = storyToSave.summary;
                    }
                });
            }
        });

        scope.$on('storyCommentSaved', function (e, story) {
            stories.saveComment(story, story.newComment, function (savedStory) {
                story.newComment = undefined;
                story.comments = savedStory.comments;
            });
        });

        scope.$on('storyChanged', function (e, story) {
            if (!story.isSelected) {
                pulse(story);   
            }
            // TODO: Do we need this serverStory runaround?
            var serverStory = stories.get(story.id);
            stories.save(serverStory);
        });

        // Refactor: Put these io-handlers into their own directive.
        scope.$on('ioStory', function (e, payload) {
            var story = payload.data;
            var viewModel = stories.get(story.id);
            viewModel.status = story.status;


            if (story.newComment) {
                var commentFound = false;
                // Add this new comment to the story's comment list
                // if we don't already have it.
                for (index in viewModel.comments) {
                    var comment = viewModel.comments[index];
                    if (comment.timestamp === story.newComment.timestamp
                        && comment.createdBy.id === story.newComment.createdBy.id) {
                        commentFound = true;
                    }
                }
                if (!commentFound) {
                    viewModel.comments.push(story.newComment);
                }
            }

            if (!viewModel.isSelected) {
                viewModel.labels = story.labels;
                viewModel.summary = story.summary;
                viewModel.description = story.description;
                viewModel.owner = story.owner;

                pulse(viewModel);
            }
            else if (payload.user !== scope.accountName) {
                viewModel.warning = payload.user + " has just edited this task."
                pulse(viewModel);
            }
        });

        scope.$on('ioMoveBlock', function (e, payload) {
            var startStory = stories.get(payload.data.startStoryId);
            var endStory = stories.get(payload.data.endStoryId);
            var nextId = payload.data.newNextId;

            var nextStory = stories.get(nextId);

            var isLocalOnly = true;
            if (startStory && endStory && nextStory) {
                moveStoryBlock(startStory, startStory, endStory, nextStory, isLocalOnly);
            }
        });


        scope.$on('ioStoryAdded', function (e, payload) {
            var story = payload.data;

            // TODO: Make a more robust way of determining
            // if we're receiving an echo of our own insertion.
            if (stories.get(story.id) || 
                (storyBeingInserted && story.summary === storyBeingInserted.summary)) {
                return;
            }

            stories.local.add(story);
            if (story.isFirstStory) {
                stories.setFirst(story);
            }
            insertNewStoryIntoViewModel(story);
            $timeout(function () {
                pulse(story);
            }, 100);
            
            // TODO: Check list integrity. If bad, get
            // the list again from the server.
        });

        scope.$on('ioStoryRemoved', function (e, payload) {
            var story = payload.data;
            if (!stories.get(story.id)) {
                return;
            }

            var storyToRemove = stories.get(story.id);
            var shouldAnimate = true;
            removeFromView(storyToRemove, storyToRemove, shouldAnimate);
        });

        scope.$on('ioStoryHighlighted', function (e, payload) {
            var storyId = payload.data.storyId;
            var story = stories.get(storyId);
            if (story) { 
                // Clear old data
                for (var index in teamHighlightedStories) {
                    if (teamHighlightedStories[index] === payload.user) {
                        delete teamHighlightedStories[index];
                    }
                }

                // Save new data
                if (story.isHighlighted && payload.user === scope.accountName) {
                    // Do nothing.
                }
                else {
                    // Note: We lazily use this teamHighlightedStories dictionary
                    // for two purposes: remembering stories by ID and by user.
                    teamHighlightedStories[payload.user] = story;
                    if (teamHighlightedStories[story.id] !== scope.accountName) {
                        teamHighlightedStories[story.id] = payload.user;
                    }
                }
            }
        });

        scope.isStoryHighlightedByTeam = function (story) {
            if (teamHighlightedStories[story.id]) {
                return true;
            }
            return false;
        };

        scope.$on('storyNotify', function (e, story, event) {
            if (!story.isNotifying && !story.isOwnerNotified) {
                story.isNotifying = true;

                var notificationSuccessful = function () {
                    story.isNotifying = undefined;
                    story.isOwnerNotified = true;
                };

                event.stopPropagation();

                if (isFacade) {
                    var oneSecond = 1000;
                    $timeout(notificationSuccessful, oneSecond);
                    return;
                }

                $http.post('/data/story/notify/new', story)
                .success(function (data) {
                    notificationSuccessful();
                })
                .error (function (data, status) {
                    story.isNotifying = undefined;
                    errors.handle(data, status);
                });
            }       
        });


        function scrollToStory (storyId, keepClosed, delay, isMovingUp) {
            if (typeof delay === 'undefined') {
                delay = 250;
            }

            storiesList.forEach(function (story, index) {
                if (story.id === storyId) {
                    var scrollNow = function () {
                        var elementId = '[data-story-id="' + story.id + '"]'
                        var topMargin = 75;
                        if (isMovingUp) {
                            topMargin *= 2.5;
                        }
                        if (delay > 0) {
                            // Use jQuery to smooth-scroll to where we
                            // want to be.
                            $('html, body').animate({
                                scrollTop: $(elementId).offset().top - topMargin
                            }, delay);
                        }
                        else {
                            $('html, body').scrollTop($(elementId).offset().top - topMargin);
                        }
        
                        if (!keepClosed) {
                            story.isSelected = true;
                            selectedStory = story;
                        }
                    };

                    // HACK: Wait for the ng-repeat element to
                    // populate itself. 250 milliseconds should
                    // be long enough for our needs.
                    $timeout(scrollNow, delay);

                    // If we ever want to do things the Angular way, 
                    // it's closer to this:
                    //  $anchorScroll();
                    //  $location.hash("story-" + index);
                }
            });
        };
        shared.scrollToStory = scrollToStory;


        scope.$on('scrollToStory', function (e, storyId) {
            // Special stories
            if (storyId === "next-meeting") {
                storiesList.forEach(function (story) {
                    if (story.isNextMeeting) {
                        storyId = story.id;
                    }
                });
            }

            // TODO: Implications of listId
            $http.get('/data/story/' + storyId)
            .success(function (story) {
                if (story.projectId !== circleId) {
                    // switch the active circle
                    var circleFacade = {
                        _id: story.projectId
                    };

                    scope.$emit('setActiveCircle', circleFacade, false, function () {
                        $location.path("/stories/" + storyId);
                        $route.reload();
                    });             
                }
                else {
                    highlightedStories.highlight(stories.get(storyId), 'single');
                    scrollToStory(storyId);
                }
            })
            .error(function (data, status) {
                errors.log(data, status);
            });
        });

        // TODO: It would be nice if we didn't have to 
        // wait a magic amount of time, and could react
        // to some event.
        scope.$on('mindsetChanged', function (e, mindset) {
            $timeout(function () {
                dragAndDrop.activate();
            }, 500);
        });

        // Tmp for development:
        // selectedLabels.push("label");
        scope.$on('labelSelected', function (e, text) {
            if (selectedLabels.indexOf(text) < 0) {
                selectedLabels.push(text);  
            }
        });

        scope.$on('ownerSelected', function (e, owner) {
            if (owner) {
                selectedOwner = owner;
                scope.selectedOwner = selectedOwner;
            }
        });

        scope.clearFilter = function () {
            selectedLabels = [];
            scope.selectedLabels = selectedLabels;
            scope.deselectOwner();
        };

        scope.deselectLabel = function (text) {
            var labelIndex = selectedLabels.indexOf(text);
            if (labelIndex >= 0) {
                selectedLabels.splice(labelIndex, 1);   
            }
        };

        scope.deselectOwner = function () {
            selectedOwner = undefined;
            scope.selectedOwner = selectedOwner;
            scope.$emit('ownerSelected', selectedOwner);
        };

        scope.shouldHideStory = function (story) {
            var shouldHide = false;

            // Always show deadlines and next meeting, 
            // so that people have context for the tasks
            if (story.isDeadline || story.isNextMeeting) {
                return false;
            }

            // Search
            if (searchEntry && searchEntry.length > 0) {
                for (index in searchEntry) {
                    if (story.summary.toLowerCase().indexOf(searchEntry[index]) < 0) {
                        if (story.owner && story.owner.toLowerCase().indexOf(searchEntry[index]) >= 0) {
                            // Stay cool.
                        }
                        else {
                            shouldHide = true;
                        }
                    }
                }
            }

            // Labels
            if (selectedLabels.length > 0) {

                if (!story.labels || story.labels.length <= 0) {
                    shouldHide = true;
                }
                else {
                    for (var selectedLabelIndex in selectedLabels) {
                        var selectedLabel = selectedLabels[selectedLabelIndex];
                        if (story.labels.indexOf(selectedLabel) < 0) {
                            shouldHide = true;
                            break;
                        }
                    }   
                }
            }

            // Owner filter
            if (selectedOwner) {
                if (story.owner !== selectedOwner) {
                    shouldHide = true;
                }
            }
            
            return shouldHide;
        };
        shared.shouldHideStory = scope.shouldHideStory;

        scope.isMindset = function (m) {
            if (scope.mindset) {
                return scope.mindset === m;
            }
            return lib.mindset.is(m);
        };

        scope.getMindsetClass = function () {
            if (scope.mindset) {
                return "mindset-" + scope.mindset;
            }
            return "mindset-" + lib.mindset.get();
        };

        function updateViewModelStoryOrder() {
            // The drag-and-drop stuff manipulates the DOM, 
            // but doesn't touch our view-model, so we need to 
            // update our stories array to reflect the new order
            //  of things.
            var applyNextMeeting = function (stories) {
                var isAfterNextMeeting = false;
                for (var key in stories) {
                    if (isAfterNextMeeting) {
                        stories[key].isAfterNextMeeting = true;
                    }
                    else if (stories[key].isNextMeeting) {              
                        isAfterNextMeeting = true;
                    }
                    else {
                        stories[key].isAfterNextMeeting = false;
                    }
                }
                return stories;
            };

            var storiesInNewOrder = [];

            if (stories.isListBroken()) {
                scope.$emit('storyListBroken');
                return;
            }

            var firstStory = stories.getFirst();
            var currentStory = firstStory;
            
            while (currentStory) {
                storiesInNewOrder.push(currentStory);
                currentStory = stories.get(currentStory.nextId);
            }

            if (storiesInNewOrder.length === storiesList.length) {
                // Update isAfterNextMeeting for all stories
                storiesInNewOrder = applyNextMeeting(storiesInNewOrder);

                // Update our view with the proper story order
                //
                // TODO: We really only need to update the range of
                // stories affected, not all of them, but that can 
                // be a performance optimization later.
                for (var key in storiesInNewOrder) {
                    storiesList[key] = stories.get(storiesInNewOrder[key].id);
                }
                scope.$broadcast('storyOrderUpdated');

                buildMilepostList(storiesList);
            }
            else {
                console.log("NEW:     " + storiesInNewOrder.length);
                console.log("CURRENT: " + storiesList.length);
                throw new Error("New order count mismatch");
                // errors.handle("Something unknown happened with the move. Need to refresh page.", "client");
            }
        };

        scope.$watch('isFacade', function (newVal) {
            isFacade = newVal;
            stories.setFacade(isFacade);
        });

        // Refactor: Move into own directive with other filters
        scope.$on('cbSearchEntry', function (e, val) {
            if (!val) {
                scope.searchEntry = undefined;
            }
            else {
                val = val.toLowerCase();
                // searchEntry = val.split(" ");
                // Get phrases surrounded by quotes: 
                // http://stackoverflow.com/questions/16261635/javascript-split-string-by-space-but-ignore-space-in-quotes-notice-not-to-spli
                scope.searchEntry = val.match(/(?:[^\s"]+|"[^"]*")+/g);
                // Remove quotes
                for (index in scope.searchEntry) {
                    var token = scope.searchEntry[index];

                    if (token.length >= 2 &&
                        token.charAt(0) === '"' && 
                        token.charAt(token.length-1) === '"') {
                        scope.searchEntry[index] = token.substring(1, token.length - 1);
                    }
                }
            }
        });

        var getLastStoryId = function () {
            return "last-" + (listId || circleId);
        };

        var getStoryElement = function (id) {
            return $("[data-story-id='" + id + "']");
        };

        // For drag and drop.
        shared.highlightedStories        = highlightedStories;
        shared.isStoryBetween            = isStoryBetween;
        shared.updateViewModelStoryOrder = updateViewModelStoryOrder;
        shared.getLastStoryId            = getLastStoryId;
        shared.getStoryElement           = getStoryElement;
        // Not really necessary, but useful for semantics.
        shared.scope = scope;

        shared.getCircleId = function () {
            return circleId;
        };

        shared.getListId = function () {
            return listId;
        };


        // TODO: Is this an ok way to configure the story list behavior?
        // A cooler way would be with inheritance, perhaps.
        scope.$watch('isChecklist', function (newVal) {
            isChecklist = newVal;
        });

        scope.test = function () {
            hacks.runAddTest(stories, circleId);
        };

        scope._test = function() {
            return {
                firstStory: stories.getFirst(),
                storiesTable: stories
            }
        };
    }

    return directive;
}]);