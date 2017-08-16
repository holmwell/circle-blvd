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
        }
    },
    methods: {
        save: function () {
            this.$emit('save', this.model);
            this.deselect();
        },
        deselect: function () {
            this.$emit('deselect', this);
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

        button(type="button" @click="save") Save!
</template>

