<template>
    <div name="storyForm">
        <div class="summary row">
            <div class="visible-xs col-xs-12">
                <div class="deselect"><a class="subtle jslink" @click.stop="deselect">Hide details</a></div>
            </div>
            <div class="col-xs-12 col-sm-9 summary-input">
                <input :id="'boxForStory' + id" class="form-control" type="text" 
                @keyup.enter="save"
                v-model="model.summary"/></div>
            <div ng-if="!isScreenXs" class="hidden-xs col-sm-3">
                <div class="deselect"><a @click.stop="deselect">Hide details</a></div>
            </div>
        </div>

        <div class="top-info" v-show="!(isNextMeeting || isDeadline)">
            <div class="owner">Who's doing this?
                <input type="text" v-model="model.owner" />
<!-- TODO: typeahead-owners class="typeahead form-control" /> -->
             </div>
            <div class="owner-placeholder">{{warning}}
            </div>
        </div>

        <button type="button" @click="save">Save!</button>
    </div>
</template>

<script>
module.exports = {
    props: {
        id: String,
        isDeadline: Boolean,
        isNextMeeting: Boolean,

        summary: String,
        owner: String,
        status: String,
        warning: String
    },
    data: function () {
        return {
            model: {
                id: this.id,
                summary: this.summary,
                owner: this.owner,
                status: this.status
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