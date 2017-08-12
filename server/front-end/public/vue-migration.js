//-------------------------------------------------------------------------
// Vue components for migrating the story element over to Vue.js

Vue.component('cb-story', {
    props: ['model'],
    data: function () {
        return this.model;
    },
    template: '<div>{{summary}}</div>',
});
