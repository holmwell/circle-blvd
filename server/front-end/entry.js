// dist.js
//
// Our entry point for Webpack.
//
import Story             from './components/cbStory.vue';
import StoryOwnerColumn  from './components/cbStoryOwnerColumn.vue';
import StoryStatusClass  from './components/cbStoryStatusClass.vue';
import StoryStatusColumn from './components/cbStoryStatusColumn.vue';
import StorySummary      from './components/cbStorySummary.vue';

Vue.component('cb-story', Story);
Vue.component('cb-story-owner-column', StoryOwnerColumn);
Vue.component('cb-story-status-class', StoryStatusClass);
Vue.component('cb-story-status-column', StoryStatusColumn);
Vue.component('cb-story-summary', StorySummary);