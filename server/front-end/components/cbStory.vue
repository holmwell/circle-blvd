<script>
module.exports = {
    props: {
        id: String,
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

        comments: Array
    }, 
    data: function () {
        return {
            isScreenXs: false,
            isMouseOver: false
        };
    },
    computed: {
        cssClass: function () {
            var isClipboardActive = false;
            return ['story', 'col-xs-12', 'debug', 'no-select', {
                selected: this.isSelected,
                'not-selected': !this.isSelected,

                first: this.isFirstStory,
                'first-at-load': this.isFirstAtLoad,

                deadline: this.isDeadline,
                highlighted: this.isHighlighted && !isClipboardActive,
                'next-meeting': this.isNextMeeting,
                'after-meeting': this.isAfterNextMeeting
            }];
        },
        isStoryMineClass: function () {
            return "";
        }
    },
    methods: {
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
        }
     }
}
</script>

<template lang="pug">
    div(v-bind:class="cssClass" @click="highlight" @dblclick="select" @mousedown="highlight" 
        @mouseenter="mouseOver" @mouseleave="mouseLeave")
        //-  TODO: Get the id, for scrolling 
        div(v-if="isSelected")
            cb-story-detail(v-bind="$props" @save="save" @deselect="deselect" @remove="remove")
        div(v-else)
            .row.no-select.hidden-xs
                .col-sm-10.paddy
                    .summary(:class="isStoryMineClass")
                        cb-story-summary(@select-label="selectLabel", :summary="summary")

                .col-sm-1.paddy.details.icon
                     .pull-right(v-show="isMouseOver" @click="select")
                         span.glyphicon.glyphicon-option-horizontal

                .col-sm-1.grippy
                    .pull-right.grippy-viz
                        span.grippy-bar.top
                        span.grippy-bar
                        .row
                             .col-sm-offset-5
                                .glyphicon.glyphicon-move &nbsp;
                        span.grippy-bar.top
                        span.grippy-bar
                //- TODO: bumpy
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