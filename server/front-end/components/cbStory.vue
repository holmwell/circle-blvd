<script>
module.exports = {
    props: {
        id: String,
        projectId: String,
        isSelected: Boolean,

        isFirstStory: Boolean,
        isFirstAtLoad: Boolean,

        isDeadline: Boolean,
        isHighlighted: Boolean,
        isNextMeeting: Boolean,
        isAfterNextMeeting: Boolean,

        summary: String, 
        status: String,
        owner: String,
        description: String,
        warning: String,

        comments: Array,
        index: Number,

        isScreenXs: Boolean,

        mindset: String,
        isClipboardActive: Boolean,
        isInClipboard: Boolean,
        isMine: Boolean,
        isHighlightedByTeam: Boolean
    }, 
    data: function () {
        return {
            isMouseOver: false
        };
    },
    computed: {
        cssClass: function () {
            return ['story', 'debug', 'col-xs-12', 'no-select', {
                // This is in our Angular implementation, but it seems to 
                // be incorrect.
                // 'col-sm-12': !this.isMindsetRoadmap,
                // 'col-sm-8': this.isMindsetRoadmap,

                selected: this.isSelected,
                'not-selected': !this.isSelected,

                first: this.isFirstStory,
                'first-at-load': this.isFirstAtLoad,

                deadline: this.isDeadline,
                highlighted: this.isHighlighted && !this.isClipboardActive,
                'next-meeting': this.isNextMeeting,
                'after-meeting': this.isAfterNextMeeting,
                inClipboard: this.isInClipboard,
                mine: this.isMine,
                'team-highlighted': this.isHighlightedByTeam,
            }];
        },
        isSad: function () {
            return this.status === "sad";
        },
        isActive: function () {
            return this.status === "active";
        },
        isDone: function () {
            return this.status === 'done';
        },
        isNew: function () {
            return this.status === '' || !this.status
        },
        isStoryMineClass: function () {
            return this.isMine ? 'mine' : '';
        },
        backgroundStyle: function () {
            if (this.isAfterNextMeeting || this.isDeadline || this.isSelected) {
                return "";
            }
            // TODO: What's the cool way to do this?
            return {
                'background-color': 'rgba(255,231,176,' + this.backgroundAlpha + ')'
            };
        },
        backgroundAlpha: function () {
            return 1 - (this.index * 0.12);
        },
        isMindsetRoadmap: function () {
            return this.mindset === 'roadmap';
        },
        isMindsetBump: function () {
            return this.mindset === 'bump';
        }
    },
    methods: {
        handleSingleClicks: function () {
            if (this.isSelected)
                return;

            if (this.isScreenXs) {
                this.select();
            }
            else {
                // Let a full click highlight one story,
                // even if a block is highlighted
                this.$emit('highlight', this.id);
            }
        },
        highlight: function () {
            // Only emit highlight events if we're not highlighted,
            // other we'll emit 'single' highlight events on mousedown
            // when we have multiple stories highlighted, which will
            // mess up moving a block of stories (by changing our 
            // highlight)
            //
            // Really, though, whoever we send this event to should
            // be able to figure that out, so in the future it could
            // be extracted.
            if (!this.isHighlighted) {
                this.$emit('highlight', this.id);
            }
        },
        selectLabel: function (text) {
            this.$emit('select-label', text);
        },
        select: function () {
            this.$emit('select-story', this);
        },
        save: function (story) {
            this.$emit('save', story);
        },
        saveComment: function (story) {
            this.$emit('save-comment', story);
        },
        deselect: function () {
            this.$emit('deselect-story', this);
        },
        remove: function () {
            this.$emit('remove', this);
        },
        mouseOver: function () {
            this.isMouseOver = true;
        },
        mouseLeave: function () {
            this.isMouseOver = false;
        },
        moveToTop: function () {
            this.$emit('move-to-top', this);
        }
     }
}
</script>

<template lang="pug">
    div(v-bind:class="cssClass" @click="handleSingleClicks" @dblclick="select" @mousedown="highlight" 
        @mouseenter="mouseOver" @mouseleave="mouseLeave" v-bind:style="backgroundStyle")
        //-  TODO: Get the id, for scrolling 
        div(v-if="isSelected")
            cb-story-detail(v-bind="$props" is-screen-xs="isScreenXs" 
                @save="save" 
                @save-comment="saveComment"
                @deselect="deselect" 
                @remove="remove")
        div(v-else)
            .row.no-select.hidden-xs
                .col-sm-10.paddy
                    .summary(:class="isStoryMineClass")
                        cb-story-summary(@select-label="selectLabel", :summary="summary")

                .col-sm-1.paddy.details-icon
                     .pull-right(v-show="isMouseOver" @click="select")
                         span.glyphicon.glyphicon-option-horizontal

                div(v-if="(isMindsetBump || isDone) && isAfterNextMeeting" @click.stop.prevent="moveToTop").col-sm-1.bumpy
                    .pull-right.bumpy-viz
                        div(v-show="!isFirstStory").glyphicon.glyphicon-chevron-up &nbsp;

                div(v-else).col-sm-1.grippy
                    .pull-right.grippy-viz
                        span.grippy-bar.top
                        span.grippy-bar
                        .row
                             .col-sm-offset-5
                                .glyphicon.glyphicon-move &nbsp;
                        span.grippy-bar.top
                        span.grippy-bar

            div(v-if="isScreenXs").no-select.phone-row.hidden-sm.hidden-md.hidden-lg
                //- ng-class="{mine: isStoryMine(story)}" 
            
                .col-xs-11.paddy
                    .phone-backlog-status.col-xs-2.debug.no-select
                        i(v-show="isDeadline && !isAfterNextMeeting").done-status
                        //- @click="archive" title="archive milepost")

                        i(v-show="isDone").done-status 
                        //-     class="done-status"
                        //-     ng-click="archive(story)" 
                        //-     title="archive story">
                        //- </i>

                        i(v-show="isActive").active-status
                        i(v-show="isSad").sad-status.glyphicon.glyphicon-stop

                        span.new-status(v-show="isNew && isMine") New

                    .phone-summary.col-xs-10
                        cb-story-summary(@select-label="selectLabel", :summary="summary")

                //- Note: Small screens don't switch to bumpy when a task is done
                div(v-if="isMindsetBump && isAfterNextMeeting" @click.stop.prevent="moveToTop").col-xs-1.bumpy
                    .pull-right.bumpy-viz
                        div(v-show="!isFirstStory").glyphicon.glyphicon-chevron-up &nbsp;

                div(v-else).col-xs-1.grippy
                    .pull-right.grippy-viz
                        span.grippy-bar.top
                        span.grippy-bar
                        .row
                            .col-xs-offset-5
                                .glyphicon.glyphicon-move &nbsp;
                        span.grippy-bar.top
                        span.grippy-bar

</template>

<!-- // Old template, for reference:
//
// <div ng-if="::!isScreenXs" class="row no-select hidden-xs" ng-show="!story.isSelected" id="story-{{$index}}">
//     <div class="col-sm-10 paddy">
//         <div class="summary" ng-class="{mine: isStoryMine(story)}">
//             <sp-story-summary/>
//         </div>
//     </div>
//     <div class="col-sm-1 paddy details-icon">
//         <div class="pull-right" ng-show="story.isOver" ng-click="select(story)">
//             <span class="glyphicon glyphicon-option-horizontal"></span>
//         </div>
//     </div>
//     <div ng-if="(!isMindset('bump') && !isStoryDone(story)) || !story.isAfterNextMeeting || isMindset('roadmap')" 
//         class="col-sm-1 grippy">
//         <div class="pull-right grippy-viz">
//             <span class="grippy-bar top"></span>
//             <span class="grippy-bar"></span>
//             <div class="row">
//                 <div class="col-sm-offset-5">
//                     <div class="glyphicon glyphicon-move">&nbsp;</div>
//                 </div>
//             </div>
//             <span class="grippy-bar top"></span>
//             <span class="grippy-bar"></span>
//         </div>
//     </div>

//     <div ng-if="(isMindset('bump') || isStoryDone(story)) && story.isAfterNextMeeting && !isMindset('roadmap')" 
//         class="col-sm-1 bumpy"
//         ng-mousedown="beforeMoveToTop($event, story)"
//         ng-click="moveToTop($event, story)">
//         <div class="pull-right bumpy-viz">
//             <div ng-hide="story.isFirstStory" 
//             class="glyphicon glyphicon-chevron-up">&nbsp;</div>
//         </div>
//     </div>
// </div>

// Old ng-class block:
//
// <div class="story col-xs-12 debug no-select" ng-class="{ 
//         'col-sm-12': isMindset('roadmap'),
//         'col-sm-8': !isMindset('roadmap'),
//         selected: story.isSelected, 
//         'not-selected': !story.isSelected,
//         first: story.isFirstStory,
//         'first-at-load': story.isFirstAtLoad,
//         deadline: story.isDeadline,
//         'next-meeting': story.isNextMeeting,
//         'after-meeting': story.isAfterNextMeeting,
//         highlighted: story.isHighlighted && !isClipboardActive,
//         'team-highlighted': isStoryHighlightedByTeam(story),
//         inClipboard: story.isInClipboard,
//         mine: isStoryMine(story)
//     }"
//     ng-style="{ 'background-color': 
//         !story.isAfterNextMeeting && !story.isDeadline && !story.isSelected ? 'rgba(255,231,176,' + (1 - $index * 0.12) + ')' : ''}"
//     ng-dblclick="select(story)" 
//     ng-click="handleSingleClicks(story)"
//     ng-mousedown="highlight(story)"
//     ng-mouseenter="mouseEnter(story)"
//     ng-mouseleave="mouseLeave(story)">



 -->