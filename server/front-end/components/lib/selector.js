'use strict';

var self = {
   mostRecent: null
};

export default {
   select: function (story) {
      if (self.mostRecent) {
         self.mostRecent.isSelected = false;
      }
      story.isSelected = true;
      self.mostRecent = story;
   },
   deselect: function (story) {
      story.isSelected = false;
      self.mostRecent = null;
   }
}
