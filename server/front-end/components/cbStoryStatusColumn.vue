<script>
module.exports = {
    props: {
        id: String,
        isDeadline: Boolean,
        isNextMeeting: Boolean,
        isAfterNextMeeting: Boolean,
        status: String
    },
    data: function () {
        return {
            isScreenXs: false, // TODO ...
            iconCircleSvg: require('../public/img/glyphs/icon-circle.svg'),
            iconHalfCircleSvg: require('../public/img/glyphs/icon-half-circle.svg')
        }
    },
    computed: {
        isStoryDoneClass: function () {
            return isStoryStatus(this, "done") ? "done" : "";
        },
        isStoryMine: function () {
            // TODO: Add owner, current user to props ... 
            return false;
        },
    },
    methods: {
        archive: function () {
            this.$emit('archive', this.id);
        }
    }
};

function isStory(story) {
    if (!story || story.isDeadline || story.isNextMeeting) {
        return false;
    }

    return true;
}

function isStoryStatus(story, status) {
    if (!isStory(story)) {
        return false;
    }

    if (story.status === status) {
        return true;
    }

    return false;
}
</script>

<template>
    <div v-if="!isScreenXs" class="hidden-xs col-sm-2 debug clear hide-mindset-roadmap">
        <div :class="isStoryDoneClass" class="backlog-mine col-xs-9 debug">
            <!-- The 'mine button' stuff would go here, but that should be removed anyway,
            so this is just here for spacing. -->
        </div>
        <div class="backlog-status col-xs-3 debug no-select">
            <i class="done-status done-status-archive" v-show="isDeadline && !isAfterNextMeeting" @click="archive" 
                title="archive milepost"><div v-html="iconCircleSvg"></div></i>
            <i class="done-status" @click="archive" title="archive task"><div v-html="iconCircleSvg"></div></i>
            <i class="active-status"><div v-html="iconHalfCircleSvg"></div></i>
            <i class="sad-status glyphicon glyphicon-stop"></i>
            <span class="new-status" v-show="isStoryMine">New</span>
        </div>
    </div>
</template>


<!-- // Old template, for reference:
//
// <div ng-if="::!isScreenXs" class="hidden-xs col-sm-2 debug clear hide-mindset-roadmap">
//     <div class="backlog-mine col-xs-9 debug"
//         ng-class="{done: isStoryDone(story)}">
//         <div class="show-mindset-mine" ng-show="(!story.isDeadline && !story.isNextMeeting)" 
//             ng-click="bumpStatus(story)">
//             <i class="bump-status debug hide-status-done"></i>
//             <i class="arrow glyphicon glyphicon-arrow-right debug"
//             ng-show="isStoryDone(story) && isStoryMine(story)"></i>
//         </div>
//     </div>
//     <div class="backlog-status col-xs-3 debug no-select">
//         <i class="done-status done-status-archive" 
//             ng-show="story.isDeadline && !story.isAfterNextMeeting" 
//             ng-click="archive(story)" 
//             title="archive milepost"
//             ng-include="'/img/glyphs/icon-circle.svg'"></i>
//         <i class="done-status"  
//             ng-click="archive(story)" 
//             title="archive task" 
//             ng-include="'/img/glyphs/icon-circle.svg'"></i>
//         <i class="active-status" 
//             ng-include="'/img/glyphs/icon-half-circle.svg'"></i>
//         <i class="sad-status glyphicon glyphicon-stop"></i>
//         <span class="new-status"
//         ng-show="(isStoryMine(story) || isMindset('mine'))">New</span>
//     </div>
// </div>
 -->