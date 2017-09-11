<template>
   <div class="story col-xs-12 debug no-select" :class="deadlineClass" 
      ng-click="scrollToMilepost(story)"> 
       <div class="row no-select hidden-xs" :id="'story-' + storyIndex">
           <div class="col-sm-12 paddy">
               <div class="text-select summary">
                  <cb-story-summary :summary="summary"></cb-story-summary>
               </div>
           </div>
       </div>
   </div>
</template>

<script>
   import cbStorySummary from './cbStorySummary.vue'

   export default {
      components: { cbStorySummary },

      props: {
         isAfterNextMeeting: Boolean,
         isDeadline: Boolean,
         isNextMeeting: Boolean,
         storyIndex: Number,
         summary: String
      },

      computed: {
         deadlineClass: function () {
            return {
               deadline: this.isDeadline,
               'next-meeting': this.isNextMeeting,
               'after-meeting': this.isAfterNextMeeting
            }
         }
      }
   }
</script>