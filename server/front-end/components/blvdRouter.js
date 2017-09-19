import Vue       from 'vue'
import VueRouter from 'vue-router'

import storyList from './storyList.vue'

Vue.use(VueRouter);

export default new VueRouter({
   routes: [{
      path: '/',
      component: storyList
   }]
})