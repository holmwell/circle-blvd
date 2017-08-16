<script>
module.exports = {
    props: {
        id: String,
        isDeadline: Boolean,
        isNextMeeting: Boolean,

        summary: String,
        owner: String,
        description: String,
        status: String,
        warning: String,
        createdBy: Object
    },
    data: function () {
        return {
            iconCircleSvg: require('../public/img/glyphs/icon-circle.svg'),
            iconHalfCircleSvg: require('../public/img/glyphs/icon-half-circle.svg'),
            isScreenXs: false,
            model: {
                id: this.id,
                summary: this.summary,
                owner: this.owner,
                description: this.description,
                status: this.status
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
        setStatus: function (status) {
            this.model.status = status;
            this.$emit('save', this.model);
        },
        activeIf: function (status) {
            return this.model.status === status ? 'btn-active' : '';
        },
        is: function (status) {
            return this.model.status && this.model.status === status;
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
                input.form-control(:id="'boxForStory' + id" type="text" @keyup.enter="save" v-model="model.summary")

            .hidden-xs.col-sm-3(ng-if="!isScreenXs")
                .deselect
                    a(@click.stop="deselect") Hide details

        .top-info(v-show="!(isNextMeeting || isDeadline)")
            .owner Who's doing this?
                input(type="text" v-model="model.owner")
                //- TODO: typeahead-owners class="typeahead form-control" 
            .owner-placeholder {{warning}}

        .description
            div What are the details?
                .created-by.pull-right(v-if="createdBy")
                    | {{storyNoun}} created by {{createdBy.name}}

            .textarea-container
                //- TODO: autosize
                textarea.form-control(autosize v-model="model.description")

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

        button(type="button" @click="save") Save!
</template>

