<template lang="pug">
    .col-sm-offset-2.col-xs-12.insert-destination.debug(:class="isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8'")
        .row.alignWithStoryList.debug(:class="wrapperClass")
            ul.entry-nav.nav.nav-pills.alignWithStoryList
                li(:class="noun === 'task' ? 'active' : ''")
                    a.jsLink(@click="setInsertType('task')") Task

                li(:class="noun === 'milepost' ? 'active' : ''")
                    a.jsLink(@click="setInsertType('deadline')") Milepost

                //- <li ng-class="{ active: isAdding['many'] }">
                //-     <a class="jsLink" ng-click="showEntry('many')">Many</a>
                //- </li>
                //- <li ng-class="{ active: isAdding['checklist'] }">
                //-     <a class="jsLink" ng-click="showEntry('checklist')">Checklist</a>
                //- </li>
                li.pull-right
                    a.jsLink.subtle(@click="hide") Hide entry

            .input-group
                input#storyInsert(v-model="summary" @keyup.enter="insertStory"
                    type="text" autocomplete="off" tabindex="1").form-control

                span.input-group-btn
                    button(@click="insertStory" tabindex="3").btn.btn-default.pull-right Add {{noun}}

            textarea#task-description(v-model="description" :placeholder="(noun + ' description ...') | capitalize" tabindex="2").form-control
</template>

<script>
import Autosize from 'autosize'

export default {
    props: {
        story: Object,
        mindset: String,
        insertType: String
    },
    data: function () {
        return {
            summary: "",
            description: ""
        }
    },
    methods: {
        insertStory: function () {
            this.$emit('insert-story', {
                task: {
                    summary: this.summary,
                    description: this.description,
                    isDeadline: this.insertType === 'deadline'
                },
                nextStory: this.story
            });

            // Clear out data for another story entry
            this.summary = "";
            this.description = "";
        },
        setInsertType: function (val) {
            this.insertType = val;
        },
        hide: function () {
            this.$emit('hide');
        }
    },
    computed: {
        isMindsetRoadmap: function () {
            return this.mindset === 'roadmap';
        },
        wrapperClass: function () { 
            switch (this.insertType) {
                case 'task':
                case 'default':
                    return ['new-story'];
                case 'deadline':
                    return ['new-story', 'deadline', 'after-meeting'];
                default:
                    return ['new-story'];
            }
        },
        noun: function () {
            switch (this.insertType) {
                case 'task':
                case 'default':
                    return 'task';
                case 'deadline':
                    return 'milepost';
                default:
                    return 'task';
            }
        }
    },
    filters: {
        capitalize: function (value) {
            if (!value) return ''
            value = value.toString()
            return value.charAt(0).toUpperCase() + value.slice(1)
        }
    },
    mounted: function () {
        Autosize(document.getElementById('task-description'));
    }
}
</script>

<style scoped>
    #storyInsert, #task-description {
        background-color: white !important;
    }
    .new-story {
        background-color: #eee;
    }
    .entry-nav {
        background-color: inherit;
        margin-bottom: 1ex;
    }
    .nav > li > a:hover {
        background-color: inherit;
    }
    .deadline .nav > li.active > a {
        background-color: #333;
    }
    .btn {
        border-color: rgb(170, 170, 170);
    }
    .deadline .btn {
        border-color: rgb(85, 85, 85);
    }
</style>