<script>
import Autolinker from "autolinker"
import Autosize from "autosize"
import Awesomplete from "awesomplete"
import dateformat from "dateformat"
import sanitizeHtml from "sanitize-html"

export default {
    props: {
        id: String,
        projectId: String,
        isDeadline: Boolean,
        isNextMeeting: Boolean,

        summary: String,
        owner: String,
        description: String,
        status: String,
        warning: String,
        createdBy: Object,

        comments: Array,
        isScreenXs: Boolean,
        owners: Array
    },
    data: function () {
        return {
            iconCircleSvg: require('../public/img/glyphs/icon-circle.svg'),
            iconHalfCircleSvg: require('../public/img/glyphs/icon-half-circle.svg'),
            model: {
                id: this.id,
                projectId: this.projectId,
                summary: this.summary,
                owner: this.owner,
                description: this.description,
                status: this.status,
                newComment: null
            }
        }
    },
    computed: {
        storyNoun: function () {
            if (this.isDeadline || this.isNextMeeting) {
                return 'milepost';
            }
            else {
                return 'task';
            }
        },
        isSad: function () {
            return this.is('sad');
        },
        isNew: function () {
            if (!this.model.status) {
                return true;
            }
            return this.model.status === '';
        },
        isAssigned: function () {
            return this.is('assigned');
        },
        commentsReversed: function () {
            if (!this.comments) {
                return [];
            }

            return this.comments.slice().reverse();
        }
    },
    methods: {
        save: function () {
            this.$emit('save', this.model);
            this.deselect();
        },
        deselect: function () {
            this.$emit('deselect', this);
        },
        remove: function () {
            this.deselect();
            this.$emit('remove', this);
        },
        setStatus: function (status) {
            this.model.status = status;
            this.$emit('save', this.model);
        },
        activeIf: function (status) {
            return this.model.status === status ? 'btn-active' : '';
        },
        is: function (status) {
            return this.model.status && this.model.status === status;
        },
        saveComment: function () {
            this.$emit('save-comment', this.model);
        },
        linky: function (text) {
            var options = {
                allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
                allowedAttributes: {
                    'a': [ 'href' ]
                }
            };

            return Autolinker.link(sanitizeHtml(text, options));
        }
    },
    filters: {
        date: function (timestamp) {
            var date = new Date(timestamp);
            var now = new Date();
            var filter = "";

            if (now.getDate() === date.getDate()
            && now.getMonth() === date.getMonth()
            && now.getFullYear() === date.getFullYear()) {
                // Today
                filter = "'at' h:MM tt";
            }
            else if (now.getFullYear() === date.getFullYear()) {
                // This year
                filter = "'on' mmm d";
            }
            else {
                filter = "'on' mmm d, yyyy";
            }

            return dateformat(timestamp, filter);
        }
    },
    mounted: function () {
        var textareas = ['comment-textarea', 'description-textarea'];
        for (var index in textareas) {
            Autosize(document.getElementById(textareas[index]));
        }
    }
};
</script>

<template lang="pug">
    div(name="storyForm")
        .summary.row
            .visible-xs.col-xs-12
                .deselect
                    a.subtle.jslink(@click.stop="deselect") Hide details

            .col-xs-12.col-sm-9.summary-input
                input.form-control(:id="'boxForStory' + id" type="text" autocomplete="off"
                    @keyup.enter="save" 
                    v-model="model.summary")

            .hidden-xs.col-sm-3(ng-if="!isScreenXs")
                .deselect
                    a(@click.stop="deselect") Hide details

        .top-info(v-show="!(isNextMeeting || isDeadline)")
            .owner Who's doing this?
                input(type="text" v-model="model.owner" list="owner-list").form-control.awesomplete
                datalist#owner-list
                    option(v-for="name in owners") {{name}}
            .owner-placeholder {{warning}}

        .description
            div What are the details?
                .created-by.pull-right(v-if="createdBy")
                    | {{storyNoun}} created by {{createdBy.name}}

            .textarea-container
                textarea#description-textarea.form-control(v-model="model.description")

        .status(v-show="!(isNextMeeting || isDeadline)") Task progress?
            .row
                .col-xs-5.col-sm-2.wider-left.debug
                    a(:class="activeIf('sad')" @click="setStatus('sad')").btn.btn-default.sad.form-control
                        i.btn-icon-status.glyphicon.glyphicon-stop
                        span Help?

                .col-xs-3.col-sm-2.debug
                    a(:class="activeIf('')" @click="setStatus('')").btn.btn-default.question.neutral.form-control
                        span.txt New

                .col-xs-4.col-sm-2.wider
                    a(:class="activeIf('assigned')" @click="setStatus('assigned')").btn.btn-default.neutral.form-control
                     | Will do

                .hidden-xs.col-sm-3.wider(v-if="!isScreenXs")
                    a(:class="activeIf('active')" @click="setStatus('active')").btn.btn-default.in-progress.form-control
                        i.btn-icon-status
                            span(v-html="iconHalfCircleSvg")
                        span &nbsp;On it

                .col-xs-6.visible-xs
                    a(:class="activeIf('active')" @click="setStatus('active')").btn.btn-default.in-progress.form-control
                        i.btn-icon-status
                            span(v-html="iconHalfCircleSvg")
                        span &nbsp;On it

                .col-xs-6.col-sm-3.wider
                    a(:class="activeIf('done')" @click="setStatus('done')").btn.btn-default.done.form-control
                        i.btn-icon-status
                            span(v-html="iconCircleSvg")
                        span &nbsp;Done!

        .commentArea(v-if="!(isNextMeeting || isDeadline)")
            .commentHeading Questions or comments?
            .textarea-container
                textarea#comment-textarea(placeholder="Add comment or link ..." 
                    v-model="model.newComment" rows="1").form-control

            .btn-wrapper
                .pull-right
                    span.subtle.topLinkToTask
                        a(v-bind:href="'/#/stories/' + id")
                            span.glyphicon.glyphicon-link
                            span Link to {{storyNoun}}

                    button(type="button" @click.stop="save").saveBtn.topSaveBtn.btn.btn-default Save
                
                button(type="button" @click="saveComment").saveBtn.saveCommentBtn.topSaveBtn.btn.pull-left Add comment
            
            .comments.clear
                //- ng-class-odd="'odd'"
                .comment(v-for="comment in commentsReversed") 
                    .text
                        span.name {{comment.createdBy.name}}, 
                        //- TODO: getTimestampFilter(comment)
                        span.timestamp {{comment.timestamp | date}}:&nbsp;
                        span(v-html="linky(comment.text)")

        .action-buttons
            button(v-if="!isScreenXs" v-show="!isNextMeeting" type="button" @click="remove").hidden-xs.removeBtn
                span Remove {{storyNoun}}

            .pull-right(v-show="isNextMeeting || isDeadline")
                span.linkToTask.subtle
                    a(v-bind:href="'/#/stories/' + id")
                        span.glyphicon.glyphicon-link
                        span Link to {{storyNoun}}

                button(type="button" @click.stop="save").saveBtn.btn.btn-default Save
</template>

<style src="awesomplete/awesomplete.css"></style>

