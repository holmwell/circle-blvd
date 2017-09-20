<template lang="pug">
  .header(v-show="isHeaderVisible").text-select.clearfix.debug
    .container-fluid.header-inner.debug
      .title-wrapper.col-sm-6.hidden-xs.debug
        h2.title.debug
          a.jsLink(@click="changeMindset('detailed')") {{member.activeCircle.name}}

      .header-menu.col-sm-6.col-xs-12.debug
        div
          a.jsLink.glyph(@click="nav('archives')"
            :class="activeIf(mindset === 'archives')")
            .glyphicon-time.glyphicon
            div Archives

          //- Checklists are off indefinitely
          //- a.jsLinkglyph(@click="nav('lists')"
          //-   :class="activeIf(view === 'lists')")
          //-   .glyphicon-list.glyphicon
          //-   div Checklists

          a.jsLink.hidden-sm(@click="changeMindset('bump')"
            :class="activeIf(mindset === 'bump')").glyph
            .glyphicon-chevron-up.glyphicon
            div Next up

          a.jsLink.hidden-xs(@click="changeMindset('roadmap')"
            :class="{ active: mindset === 'roadmap', 'right-most': !member.isAdmin }"
            ).glyph
            .glyphicon-road.glyphicon
            div Roadmap

          a.glyph.jsLink.right-most.hidden-xs(
            :class="activeIf(mindset === 'admin')"
            @click="nav('admin')")
            .glyphicon-cog.glyphicon
            div Admin

    .back-bar(v-if="isBackBarVisible")
      .container-fluid
        a.jsLink(@click="changeMindset('detailed')")
          .glyphicon-chevron-left.glyphicon
        //- TODO: We got rid of backBarUrl, but we might need it as
        //- we continue our migration
        //-
        //- We also got rid of backBarText / 'Back to task list'
        a.jsLink(@click="changeMindset('detailed')") {{backBarText || 'Back to standard view'}}


</template>

<script>
export default {
	name: 'circle-header',
	props: ['circleId', 'member', 'mindset', 'view', 'backBarText'],

  data: function () {
    return {
      isHeaderVisible: true
    }
  },

  computed: {
    isBackBarVisible: function () {
      return this.mindset !== 'detailed'
    }
  },

  methods: {
    changeMindset: function (name) {
      this.$emit('mindset-changed', name);
    },
    nav: function (destination) {
      this.$emit('nav', destination);
    },
    activeIf: function (condition) {
      return condition ? 'active' : null;
    }
  }
}
</script>