// ooooooooooooooooooooooooooooooooooooo
// ooooooooooooo
// oooo
//
import Vue from "vue"
import blvd from './components/blvd.vue'

// This is the root Vue element of our app. It is one component -- blvd. 
// We do this little dance to get into the Vue Way of componenets and 
// pre-compiled (via webpack) templates as soon as possible.
new Vue({
    el: 'circle',
    name: 'Circle',
    components: { blvd },
    // Use render here instead of a string template so
    // we don't have to include the compiler in our dist.
    render (createElement) {
        return createElement('blvd', {
            attrs: {
                id: this.rawAttr("id"),
                member: this.rawAttr("member"),
                stories: this.rawAttr("stories"),
                listMeta: this.rawAttr("listMeta") 
            },
            props: {
                circleId: this.rawAttr("id"),
                member: this.attr("member"), 
                stories: this.attr("stories"), 
                listMeta: this.attr("listMeta")
            }
        })
    },
    methods: {
        attr: function (attrName) {
            return JSON.parse(this.$el.attributes[attrName].value);
        },
        rawAttr: function (attrName) {
            return this.$el.attributes[attrName].value;
        }
    }
});