<script>
import InsertStory       from './cbInsertStory.vue';
import HighlightedTools  from './cbStoryHighlightedTools.vue';
import Story             from './cbStory.vue';
import StoryOwnerColumn  from './cbStoryOwnerColumn.vue';
import StoryStatusClass  from './cbStoryStatusClass.vue';
import StoryStatusColumn from './cbStoryStatusColumn.vue';

export default {
    components: {
        'cb-story': Story,
        'cb-story-owner-column': StoryOwnerColumn,
        'cb-story-status-class': StoryStatusClass,
        'cb-story-status-column': StoryStatusColumn,
        'cb-story-highlighted-tools': HighlightedTools,
        'cb-insert-story': InsertStory,
    },
    props: {
        scope: Object, 
        stories: Array,
        highlightedStories: Array, 
        selectedOwner: String,
        selectedLabels: Array,
        searchEntry: Array,
        isScreenXs: Boolean,
        isShowingInsertStory: Boolean,
        isClipboardActive: Boolean,
        initialMindset: String
    },
    data: function () {
        return {
            isDragging: false,
            mindset: this.initialMindset
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
        save: function (story) {
            this.emit('storySaved', story)
        },
        saveComment: function (story) {
            this.emit('storyCommentSaved', story);
        },
        highlight: function (id) {
            var highlightingType = this.scope.keyboard.isShiftDown ? 'multi' : 'single';
            this.scope.$emit('storyHighlight', id, highlightingType);
        },
        insertStory: function (options) {
            this.scope.insertStory(options.task, options.nextStory);
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
            this.scope.$emit('labelSelected', text);
        },
        selectOwner: function (owner) {
            this.scope.$emit('ownerSelected', owner);
        },
        selectStory: function (story) {
            if (this.isDragging || story.isBeingDragged) {
                // Do nothing. We're dragging. See the note
                // in 'drag:end' as to why.
                return;
            }

            // Do not refocus stuff if we're already on this story.
            if (!story.isSelected) {
                this.scope.$emit('beforeStorySelected');
                var selectedStory = null;
                this.editStory(story, function (edit) {
                    edit.isSelected = true;
                    selectedStory = edit;
                    return edit;
                });
                this.scope.$emit('storySelected', selectedStory);
            }
        },
        deselectStory: function (story) {
            if (story && story.isSelected) {
                var editedStory = null;
                this.editStory(story, function (edit) {
                    edit.isSelected = false;
                    editedStory = edit;
                    return edit;
                });
                
                this.scope.$emit('storyDeselected', editedStory);
            }

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

        var self = this;
        this.scope.$on('storyHighlighted', function (e, story) {
            for(var index in self.scope.stories) {
                self.scope.stories[index].isMostRecentHighlight = false;
            }
            story.isMostRecentHighlight = true;
            self.updateStory(story);
        });
        this.scope.$on('storyUnhighlighted', function (e, story) {
            story.isMostRecentHighlight = false;
            self.updateStory(story);
        });
        this.scope.$on('storyOrderUpdated', function () {
            for (var index in self.scope.stories) {
                Vue.set(self.stories, index, self.scope.stories[index]);
            }
        });
        this.scope.$on('mindsetChanged', function (e, mindset) {
            self.mindset = mindset;
        });
        this.scope.$on('spIsDragging', function (e, val) {
            self.isDragging = val;
        });
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
            <cb-insert-story v-if="isShowingInsertStory && story.isMostRecentHighlight"
                :story="story"
                @insert-story="insertStory"
            ></cb-insert-story>
            
            <div v-cloak v-if="isClipboardActive && story.isHighlighted">
                <div class="story col-sm-offset-2 col-xs-12 debug paste-destination"
                    :class="isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8'">
                    <div class="paddy">(clipboard tasks will be moved here)</div>
                </div>
            </div>

            <cb-story-highlighted-tools v-if="!isMindsetRoadmap"
                :is-clipboard-active="isClipboardActive"
                :is-screen-xs="isScreenXs"
                :is-most-recent-highlight="story.isMostRecentHighlight"
                :is-showing-insert-story="isShowingInsertStory" 
                @change-status="scope.markHighlightedAs"
                @show-insert-story="scope.showInsertStory"
                @hide-insert-story="scope.hideInsertStory"
                @cut="scope.cutHighlighted"
                @paste="scope.pasteHighlighted">
                </cb-story-highlighted-tools>

            <cb-story-status-column v-bind="story" 
                @archive="emit('storyArchived', story)">
            </cb-story-status-column>

            <cb-story v-bind="story" 
                :is-screen-xs="isScreenXs"
                :is-clipboard-active="isClipboardActive"
                :is-mine="isMine(story)"
                :is-highlighted-by-team="isHighlightedByTeam(story)"
                :index="index"
                :mindset="mindset"
                @highlight="highlight" 
                @select-label="selectLabel" 
                @select-story="selectStory"
                @deselect-story="deselectStory"
                @remove="emit('storyRemoved', story)"
                @move-to-top="emit('storyMovedToTop', story)"
                @save="save"
                @save-comment="saveComment"></cb-story>

            <cb-story-owner-column v-bind="story" 
                @select-owner="emit('ownerSelected', story.owner)">
            </cb-story-owner-column>
        </cb-story-status-class>
    </div>
</div></template>