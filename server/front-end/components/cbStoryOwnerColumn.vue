<template lang="pug">
    .backlog-owner.hidden-xs.col-sm-2.debug.no-select.hide-mindset-roadmap(v-if="!isScreenXs", :class="isAfterClass")
        span.owner-name(@mousedown="ownerSelected") {{owner}}
        span.show-status-new ?
        //- TODO: Notification ...
</template>

<script>
module.exports = {
    props: {
        id: String,
        isAfterNextMeeting: Boolean,
        owner: String
    },
    data: function () {
        return {
            isScreenXs: false // TODO ...
        }
    },
    computed: {
        isAfterClass: function () {
            return this.isAfterNextMeeting ? "after" : "";
        }
    },
    methods: {
        ownerSelected: function () {
            this.$emit('select-owner', this.owner);
        }
    }
};

// Old template, for reference:
//
// <div class="backlog-owner hidden-xs col-sm-2 debug no-select hide-mindset-roadmap" 
//     ng-if="::!isScreenXs"
//     ng-class="{'after': story.isAfterNextMeeting}"
//     ng-dblclick="select(story)">
//     <span class="owner-name" ng-mousedown="selectOwner(story.owner)">{{story.owner}}</span><span class="show-status-new">?</span>
//     <div 
//         class="notify" 
//         ng-if="::isNotificationEnabled()"
//         ng-class="{ notified: story.isOwnerNotified }"
//         ng-show="isOwnerInCircle(story.owner) && isStoryNew(story)"
//         title="notify owner"><i class="glyphicon glyphicon-envelope" ng-click="notify(story, $event)"></i>
//         <span ng-show="story.isNotifying">o</span>
//         <i ng-show="story.isOwnerNotified" title="ok!" class="glyphicon glyphicon-ok"></i>
//     </div>
// </div>
</script>
