Vue.component('cb-story', {
    props: {
        id: String,
        isSelected: Boolean,

        isFirstStory: Boolean,
        isFirstAtLoad: Boolean,

        isDeadline: Boolean,
        isHighlighted: Boolean,
        isNextMeeting: Boolean,
        isAfterNextMeeting: Boolean,

        summary: String, 
        status: String
    }, 
    data: function () {
        return {};
    },
    computed: {
        cssClass: function () {
            var isClipboardActive = false;
            return ['story', 'col-xs-12', 'debug', 'no-select', {
                selected: this.isSelected,
                'not-selected': !this.isSelected,

                first: this.isFirstStory,
                'first-at-load': this.isFirstAtLoad,

                deadline: this.isDeadline,
                highlighted: this.isHighlighted && !isClipboardActive,
                'next-meeting': this.isNextMeeting,
                'after-meeting': this.isAfterNextMeeting
            }];
        },
    },
    methods: {
        highlight: function () {
            this.$emit('highlight', this.id);
        }
    },
    template: '<div v-bind:class="cssClass" @click="highlight" @mousedown="highlight">{{summary}}</div>'
});