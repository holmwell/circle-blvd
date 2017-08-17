<template>
    <div class="col-sm-offset-2 col-xs-12 debug insert-destination" 
        :class="isMindset('roadmap') ? 'col-sm-12' : 'col-sm-8'">
        <div class="debug new-story row alignWithStoryList">
            <div>
                <div class="input-group">
                    <input id="storyInsert" tabindex="1" type="text" autocomplete="off" class="form-control" 
                        v-model="summary" 
                        @keyup.enter="insertStory"
                    />
                    <span class="input-group-btn">
                        <button tabindex="3" class="btn btn-default pull-right" 
                            @click="insertStory">Add task</button>
                    </span>
                </div>

                <textarea class="form-control" tabindex="2" v-model="description" autosize
                    placeholder="Task description ..."></textarea>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        story: Object
    },
    data: function () {
        return {
            summary: "",
            description: ""
        }
    },
    methods: {
        insertStory: function () {
            var options = {
                task: {
                    summary: this.summary,
                    description: this.description,
                },
                nextStory: this.story
            };
            this.$emit('insert-story', options);
            this.summary = "";
            this.description = "";
        },
        isMindset: function (m) {
            return false;
        }
    }
}
</script>