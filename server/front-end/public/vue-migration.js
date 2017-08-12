//-------------------------------------------------------------------------
// Vue components for migrating the story element over to Vue.js
//
Vue.component('cb-story', {
    props: {
        summary: '', 
        isHighlighted: false
    }, 
    data: function () {
        return {};
    },
    computed: {
        cssClass: function () {
            var isClipboardActive = false;
            return {
                story: true,
                highlighted: this.isHighlighted && !isClipboardActive,
            };
        }
    },
    methods: {
        highlight: function () {
            this.$emit('highlight');
        }
    },
    template: '<div v-bind:class="cssClass" @click="highlight" @mousedown="highlight">{{summary}}</div>',
});
