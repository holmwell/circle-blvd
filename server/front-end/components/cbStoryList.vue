<script>
import Vue from 'vue'

import InsertStory       from './cbInsertStory.vue'
import HighlightedTools  from './cbStoryHighlightedTools.vue'
import Story             from './cbStory.vue'
import StoryOwnerColumn  from './cbStoryOwnerColumn.vue'
import StoryStatusClass  from './cbStoryStatusClass.vue'
import StoryStatusColumn from './cbStoryStatusColumn.vue'
import StoryListBus      from './lib/storyListBus.js'

import debounce from "lodash.debounce"

export default {
    name: 'cb-story-list',
    components: {
        'cb-story': Story,
        'cb-story-owner-column': StoryOwnerColumn,
        'cb-story-status-class': StoryStatusClass,
        'cb-story-status-column': StoryStatusColumn,
        'cb-story-highlighted-tools': HighlightedTools,
        'cb-insert-story': InsertStory,
    },
    props: {
        scope: Object, // For calling methods only, please
        stories: Array,
        selectedOwner: String,
        selectedLabels: Array,
        searchEntry: Array,
        isScreenXs: Boolean,
        isShowingInsertStory: Boolean,
        isClipboardActive: Boolean,
        isSearching: Boolean,
        initialMindset: String,
        owners: Array,
        accountName: String,
        keyboard: Object
    },
    data: function () {
        return {
            isDragging: false,
            mindset: this.initialMindset,
            insertType: 'task',
            insertQueue: [],
            isProcessingQueue: false
        }
    },
    computed: {
        isMindsetRoadmap: function () {
            return this.mindset === 'roadmap';
        }
    },
    methods: {
        emit: function (eventName, param) {
            this.scope.$emit(eventName, param);
        },
        archive: function (storyId) {
            // emit('storyArchived', story)
            StoryListBus.$emit('archive-story', storyId);
        },
        save: function (story) {
            // this.emit('storySaved', story)
            StoryListBus.$emit('save-story', story);
        },
        saveComment: function (story) {
            // this.emit('storyCommentSaved', story);
            StoryListBus.$emit('save-story-comment', story);
        },
        highlight: function (request) {
            this.hideInsertStory();

            request.type = this.keyboard.isShiftDown ? 'multi' : 'single';
            this.$emit('highlight', request);
        },
        insertStory: function (options) {
            this.insertQueue.push(options);
            // In the case of a 'many' insert, we'll get a series
            // of events in quick succession. Wait for them to 
            // settle down before we start to interact with the 
            // Angular / DOM stuff.
            this.debouncedProcessNextInQueue();
        },
        showInsertStory: function () {
            this.$emit('show-insert-story');
        },
        hideInsertStory: function () {
            this.$emit('hide-insert-story');
        },
        pasteHighlighted: function () {
            // scope.pasteHighlighted
            this.$emit('paste-highlighted');
        },
        cutHighlighted: function () {
            // scope.cutHighlighted
            this.$emit('cut-highlighted');
        },
        markHighlightedAs: function (status) {
            StoryListBus.$emit('mark-highlighted', status);
        },
        processNextInQueue: function (ok) {
            if (!ok && this.isProcessingQueue)
                return;

            var me = this;

            if (this.insertQueue.length > 0) {
                this.isProcessingQueue = true;
                var option = this.insertQueue.shift();
                StoryListBus.$emit('insert-story', option);

                // Probably don't need this nextTick anymore
                Vue.nextTick(function () {
                    me.processNextInQueue(true);
                });
            }
            else {
                this.isProcessingQueue = false;                
            }
        },
        editStory: function (story, editCallback) {
            // Utility method for dealing with story updates.
            // It's too clever, so please rewrite it if you 
            // have the energy.
            for (var index in this.stories) {
                var current = this.stories[index];
                if (current.id === story.id) {
                    var edited = editCallback(current);
                    Vue.set(this.stories, index, edited);
                }
            }
        },
        updateStory: function (newVal) {
            this.editStory(newVal, function (edit) {
                return newVal;
            });
        },
        selectLabel: function (text) {
            // this.scope.$emit('labelSelected', text);
            this.$emit('select-label', text);
        },
        selectOwner: function (owner) {
            // emit('ownerSelected', story.owner)
            // this.scope.$emit('ownerSelected', owner);
            this.$emit('select-owner', owner);
        },
        selectStory: function (story) {
            if (this.isDragging || story.isBeingDragged) {
                // Do nothing. We're dragging. See the note
                // in 'drag:end' as to why.
                return;
            }

            // Do not refocus stuff if we're already on this story.
            if (!story.isSelected) {
                StoryListBus.$emit('select-story', story);
            }
        },
        deselectStory: function (story) {
            if (story && story.isSelected) {
                StoryListBus.$emit('deselect-story', story);
            }
        },
        moveToTop: function (story) {
            // this.$emit('storyMovedToTop', story);
            StoryListBus.$emit('move-story-to-top', story, this.stories);
        },
        remove: function (story) {
            // emit('storyRemoved', story)
            StoryListBus.$emit('remove-story', story);
        },
        isMine: function (story) {
            if (story.owner && this.scope.accountName) {
                var owner = story.owner.toLowerCase();
                var member = this.scope.accountName;
                if (member) {
                    member = member.toLowerCase();
                    if (owner === member) {
                        return true;
                    }
                }
            }
            return false;
        },
        isHighlightedByTeam: function (story) {
            // TODO: This doesn't quite cut it to catch all real-time
            // updates, but this feature isn't too important right now.
            return this.scope.isStoryHighlightedByTeam(story);
        },
        insertTypeChanged: function (val) {
            this.insertType = val;
        },
        shouldHide: function (story) {
            var selectedOwner = this.selectedOwner;
            var searchEntry = this.searchEntry;
            var selectedLabels = this.selectedLabels;

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
        }
    },
    created: function () {
        // Make scope a read-only property, as adding it to
        // data as a reactive property causes havoc.
        // this.scope = scope;
        //
        var scope = this.scope;

        scope.$on('storyHighlighted', (e, story) => {
            this.updateStory(story);
        });

        scope.$on('storyUnhighlighted', (e, story) => {
            story.isMostRecentHighlight = false;
            this.updateStory(story);
        });

        scope.$on('storyOrderUpdated', () => {
            for (var index in scope.stories) {
                Vue.set(this.stories, index, scope.stories[index]);
            }
        });

        scope.$on('mindsetChanged', (e, mindset) => {
            this.mindset = mindset;
        });
        
        scope.$on('spIsDragging', (e, val) => {
            this.isDragging = val;
        });

        scope.$on('show-entry', (e) => {
            for (var index in this.stories) {
                if (this.stories[index].isFirstStory) {
                    this.highlight(this.stories[index].id);
                    break;
                }
            }

            scope.showInsertStory();
        });

        var enoughTime = 100;
        this.debouncedProcessNextInQueue = debounce(this.processNextInQueue, enoughTime);
    }
}
</script>

<template><div>
    <div v-for="(story, index) in stories" class="storyWrapper row debug no-select" 
        v-show="!shouldHide(story)"
        :class="story.isHighlighted ? 'highlightedWrapper' : ''" 
        :data-story-id="story.id" 
        :data-left-story-id="story.id"
        :key="story.id">
        <cb-story-status-class v-bind="story">
            <cb-insert-story v-if="isShowingInsertStory && story.isMostRecentHighlight && !isSearching"
                :story="story"
                :mindset="mindset"
                :insert-type="insertType"
                :account-name="accountName"
                @insert-story="insertStory"
                @hide="hideInsertStory"
            ></cb-insert-story>
            
            <div v-cloak v-if="isClipboardActive && story.isHighlighted">
                <div class="story col-sm-offset-2 col-xs-12 debug paste-destination"
                    :class="isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8'">
                    <div class="paddy">(clipboard tasks will be moved here)</div>
                </div>
            </div>

            <cb-story-highlighted-tools v-if="!isMindsetRoadmap && !isScreenXs && story.isMostRecentHighlight"
                class="hidden-xs"
                :is-clipboard-active="isClipboardActive"
                :is-screen-xs="isScreenXs"
                :is-most-recent-highlight="story.isMostRecentHighlight"
                :is-showing-insert-story="isShowingInsertStory" 
                :mindset="mindset"
                @change-status="markHighlightedAs"
                @show-insert-story="showInsertStory"
                @hide-insert-story="hideInsertStory"
                @cut="cutHighlighted"
                @paste="pasteHighlighted">
            </cb-story-highlighted-tools>

            <cb-story-status-column v-bind="story" 
                :account-name="accountName"
                @archive="archive">
            </cb-story-status-column>

            <cb-story v-bind="story" 
                :is-screen-xs="isScreenXs"
                :is-clipboard-active="isClipboardActive"
                :is-mine="isMine(story)"
                :is-highlighted-by-team="isHighlightedByTeam(story)"
                :index="index"
                :mindset="mindset"
                :owners="owners"
                @deselect-story="deselectStory"
                @highlight="highlight"
                @move-to-top="moveToTop"
                @remove="remove"
                @select-label="selectLabel" 
                @select-story="selectStory"
                @save="save"
                @save-comment="saveComment"></cb-story>

            <cb-story-owner-column v-bind="story" 
                @select-owner="selectOwner">
            </cb-story-owner-column>
        </cb-story-status-class>
    </div>
</div></template>