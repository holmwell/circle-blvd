import Vue       from 'vue'
import VueRouter from 'vue-router'

import storyList   from './storyList.vue'
import archiveList from './archiveList.vue'
import admin       from './admin.vue'
import mainframe   from './mainframe.vue'

Vue.use(VueRouter);

export default new VueRouter({
   routes: [{
      name: 'default',
      path: '/',
      component: storyList
   },{
      name: 'archives',
      path: '/archives',
      component: archiveList
   },{
      name: 'admin',
      path: '/admin',
      component: admin
   },{
      name: 'mainframe',
      path: '/mainframe',
      component: mainframe
   }]
})