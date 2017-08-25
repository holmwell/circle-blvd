<template lang="pug">
    .col-sm-offset-2.col-xs-12.insert-destination.debug(:class="isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8'")
        .row.new-story.alignWithStoryList.debug
            .input-group
                input#storyInsert(v-model="summary" @keyup.enter="insertStory"
                    type="text" autocomplete="off" tabindex="1").form-control

                span.input-group-btn
                    button(@click="insertStory" tabindex="3").btn.btn-default.pull-right Add task

            textarea(v-model="description" autosize placeholder="Task description ..." tabindex="2").form-control
</template>

<script>
export default {
    props: {
        story: Object,
        mindset: String
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
                },
                nextStory: this.story
            });

            // Clear out data for another story entry
            this.summary = "";
            this.description = "";
        }
    },
    computed: {
        isMindsetRoadmap: function () {
            return this.mindset === 'roadmap';
        }
    }
}
</script>