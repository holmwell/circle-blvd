//-------------------------------------------------------------------------
// Vue components for migrating the story element over to Vue.js
//
Vue.component('cb-story', {
    props: {
        isSelected: Boolean,

        isFirstStory: Boolean,
        isFirstAtLoad: Boolean,

        isDeadline: Boolean,
        isHighlighted: Boolean,
        isNextMeeting: Boolean,
        isAfterNextMeeting: Boolean,

        summary: String, 
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
        }
    },
    methods: {
        highlight: function () {
            this.$emit('highlight');
        }
    },
    template: '<div v-bind:class="cssClass" @click="highlight" @mousedown="highlight">{{summary}}</div>',
});
