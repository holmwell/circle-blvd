<template lang="pug">
div
  navbar(
    :circleId="circleId", 
    :member="member" 
    @nav="nav")

  .main-wrapper
    circle-header(
      :circleId="circleId", 
      :member="member"
      :mindset="mindset"
      @nav="nav"
      @mindset-changed="setMindset")

    .main.container-fluid.no-select.debug
      .view
        story-list(:storyDictionary="stories", :listMeta="listMeta")

</template>

<script>
import navbar       from './navbar.vue'
import circleHeader from './circleHeader.vue'
import storyList    from './storyList.vue'

import http from 'axios'

export default {
  name: 'blvd',
  components: { navbar, circleHeader, storyList },
  props: ['circleId', 'member', 'stories', 'listMeta'],
  data: function () {
    return {
      mindset: 'detailed'
    }
  },
  methods: {
    nav: function (destination) {
      switch (destination) {
        case 'signout':
          this.signout();
          break;
        case 'admin':
        case 'mainframe':
        case 'profile':
        case 'archives':
        case 'lists':
          this.href('/#/' + destination);
          break;
        case 'home':
          this.href('/');
          break;
        default: 
          this.href('/' + destination);
          break;
      }
    },

    href: function (url) {
      window.location.href = url;
    },

    setMindset: function (name) {
      console.log("Mindset: " + name);
      this.mindset = name;
    },

    signOut: function () {
      http.get('/auth/signout').then(function () {
        //resetSession();
        this.href("/signin");
      });
    }
  }
}
</script>