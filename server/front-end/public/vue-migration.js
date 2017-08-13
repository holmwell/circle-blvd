//-------------------------------------------------------------------------
// Vue components for migrating the story element over to Vue.js
//
Vue.component('cb-story-status-class', {
    props: {
        isDeadline: Boolean,
        isNextMeeting: Boolean,
        status: String
    },
    computed: {
        statusClass: function () {
            if (this.isDeadline) {
                return "deadline";
            }

            if (this.isNextMeeting) {
                return "next-meeting";
            }

            switch (this.status) {
                case "sad":
                case "assigned":
                case "active":
                case "done":
                    return this.status;
                default: 
                    return "new";
            }
        }
    },
    template: '<div :class="statusClass"><slot></slot></div>'
});


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
