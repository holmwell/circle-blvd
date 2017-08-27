<template lang="pug">
    .col-sm-offset-2.col-xs-12.insert-destination.debug(:class="isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8'")
        .row.alignWithStoryList.debug(:class="wrapperClass")
            ul.entry-nav.nav.nav-pills.alignWithStoryList
                li(:class="insertType === 'task' ? 'active' : ''")
                    a.jsLink(@click="setInsertType('task')") Task

                li(:class="insertType === 'deadline' ? 'active' : ''")
                    a.jsLink(@click="setInsertType('deadline')") Milepost

                li(:class="insertType === 'many' ? 'active' : ''")
                    a.jsLink(@click="setInsertType('many')") Many

                //- <li ng-class="{ active: isAdding['checklist'] }">
                //-     <a class="jsLink" ng-click="showEntry('checklist')">Checklist</a>
                //- </li>
                li.pull-right
                    a.jsLink.subtle(@click="hide") Hide entry

            div(v-if="insertType === 'many'").many
                p Enter one task per line. To add a milepost, start the line with -- (two hyphens). To assign a task, end the line with @owner (e.g. @{{accountName}}).

                //- TODO: Autosize, paste ... ng-paste="manyPaste($event)
                textarea#manyEntry.form-control(v-model="newMany.txt")

                //- p If you want to insert text before or after each task summary (e.g. #event-name), you can do so with the following:
                //- .row
                //-     .col-xs-6.many-input-wrapper-left
                //-         input(v-model="newMany.prefix" placeholder="Text before each line?").form-control.many-input

                //-     .col-xs-6.many-input-wrapper
                //-         input(v-model="newMany.suffix" placeholder="Text after each line?").form-control.many-input

                button.btn.btn-default.pull-right(@click="insertMany(newMany)") Add many

            div(v-else)
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
        insertType: String,
        accountName: String
    },
    data: function () {
        return {
            summary: "",
            description: "",
            isCreatingStory: false,
            newMany: {
                txt: ""
            }
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
        // TODO: Clean this insert / insertStory stuff up
        insert: function (story) {
            var me = this;
            me.$emit('insert-story', {
                task: {
                    summary: story.summary,
                    description: story.description
                },
                nextStory: me.story
            });
        },
        setInsertType: function (val) {
            this.$emit('change-insert-type', val);
        },
        hide: function () {
            this.$emit('hide');
        },
        insertMany: function (newMany, elementName) {
            if (!newMany) {
                return;
            }

            var me = this;
            var input = newMany.txt;
            var lines = input.split('\n');

            if (!lines || lines.length === 0 || this.isCreatingStory) {
                return;
            }

            this.isCreatingStory = true;

            var protoTasks = [];
            var currentProtoTask = undefined;

            // Run through the lines again, to capture
            // all of the lines that start with '>',
            // which denote descriptions
            angular.forEach(lines, function (line) {
                if (line.trim().length === 0) {
                    // Ignore empty lines.
                }
                else if (line[0] === '>') {
                    if (currentProtoTask.description) {
                        // Re-insert newlines in multi-line descriptions
                        currentProtoTask.description += '\n';
                    } 
                    currentProtoTask.description += line.substring(1).trim();
                }
                else {
                    if (currentProtoTask) {
                        protoTasks.push(currentProtoTask);
                    }
                    currentProtoTask = {};
                    currentProtoTask.line = line;
                    currentProtoTask.description = '';
                }
            });

            if (currentProtoTask) {
                protoTasks.push(currentProtoTask);
            }

            var createStory = function (protoTask) {
                if (!protoTask.line) {
                    return createNext();
                }

                var story = {
                    // TODO: Put lib.parseStory into a component and use it, so 
                    // we can do the prefix stuff
                    // parseStory(protoTask.line);
                    summary: protoTask.line,
                    description: protoTask.description
                };
                // TODO: Refactor out the $scope.<newMany || newChecklist>
                //
                // TODO: Migrate suffix and prefix
                //
                // var prefix = '';
                // var suffix = '';
                // if (elementName && elementName === 'checklist') {
                //     prefix = $scope.newChecklist.prefix || '';
                //     suffix = $scope.newChecklist.suffix || '';
                // }
                // else {
                //     prefix = $scope.newMany.prefix || '';
                //     suffix = $scope.newMany.suffix || '';   
                // }

                // if (prefix) {
                //     prefix = prefix.trim() + ' ';   
                // }
                // if (suffix) {
                //     suffix = ' ' + suffix.trim();
                // }

                // story.summary = prefix + story.summary + suffix;
                
                // insertNewStory(story, createNext);
                me.insert(story);
            };

            angular.forEach(protoTasks, function (task) {
                createStory(task);
            });
            
            if (elementName && elementName === 'checklist') {
                $scope.newChecklist = undefined;
                $scope.deselectChecklist();
            }
            else {
                me.newMany.txt = '';
            }
            me.isCreatingStory = false;
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
                case 'many':
                    return 'many';
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