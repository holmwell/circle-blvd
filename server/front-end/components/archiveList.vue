<template><div class="content archives-main">

<div class="page-message col-xs-12 col-sm-8 text-select v-cloak"
v-if="isArchivesEmpty">
   <p>The archives for {{circleName}} are empty.</p>

   <p>When a task is complete, and you want it off the list, use the
      <i class="btn-icon-status inline" ng-include="'/img/glyphs/icon-circle.svg'"></i>
      icon (next to the task summary) to move it into the archives.</p>
</div>

<div id="backlog" class="col-xs-12 archives">
   <div class="storyWrapper row no-select" v-for="(archive, index) in archives" :key="archive._id">
      <div class="hidden-xs col-sm-2">
         <div class="timestamp text-select"
            :class="{ 'same-as-above': isArchiveSameDateAsPrevious(archive, index) }">
            <span>{{ archive.timestamp | date }}</span>
         </div>
      </div>
      <div class="archive col-xs-12 col-sm-8 no-select" 
      @click="select(archive)"
      :class="{ 
         selected: archive.isSelected, 
         deadline: archive.isDeadline 
      }">
         <div v-show="!archive.isSelected">
            <span class="text-select">{{archive.summary}}</span>
         </div>

         <div v-if="archive.isSelected" class="text-select">
            <div class="summary">
               {{archive.summary}}
               <div class="deselect pull-right"><a @click="deselect(archive)">Hide details</a></div>
            </div>

            <div v-show="!archive.isDeadline">
               <div>Owner: {{archive.owner}}</div>
               <div>Status: {{archive.status}}</div>
               <div>Created by: {{archive.createdBy.name}}</div>
            </div>

            <div class="description">
               <div>Description:</div>
               <div class="preformatted">{{archive.description}}</div>
            </div>

            <div class="commentArea" v-if="!(archive.isNextMeeting || archive.isDeadline)">
               <div class="commentHeading">Comments:</div>
               <div class="comment" v-for="comment in reverse(archive.comments)">
                  <div class="text"><span class="name">{{comment.createdBy.name}}:</span> {{linky(comment.text)}}</div>
               </div>
            </div>
         </div>
      </div>
      <div class="hidden-xs col-sm-2">&nbsp;</div>
   </div>
   <div class="storyWrapper row" v-show="hasMoreArchives">
      <div class="col-sm-offset-2 col-sm-8 archive"
         @click="showArchivesAt(lastArchiveOnPage.sortIndex)">
         <a class="jsLink">Show more ...</a>
      </div>
   </div>
</div>
</div></template>

<script>
import errors from './lib/errors.js'

import Autolinker   from "autolinker"
import dateformat   from 'dateformat'
import sanitizeHtml from "sanitize-html"

import $http from 'axios'

export default {
   props: {
      listMeta: Object,
      member: Object
   },
   data: function () {
      return {
         archives: [],
         lastArchiveOnPage: null,
         perPageLimit: 251,
         totalArchivesCount: 0,
         selectedArchive: null
      }
   },
   computed: {
      circleName: function () {
         return this.member.activeCircle.name;
      },
      projectId: function () {
         return this.listMeta.listId;
      },
      isArchivesEmpty: function () {
         if (!this.archives) {
            return;
         }
         if (this.archives.length > 0) {
            return false;
         }
         return true;
      },
      hasMoreArchives: function () {
         if (this.archives) {
            return this.archives.length < this.totalArchivesCount;
         }
         return false;
      }
   },
   methods: {
      getArchivesUrl: function (circleId, limit, timestamp) {
         var archivesUrl = '/data/' + circleId + '/archives';

         if (limit) {
            archivesUrl += '?limit=' + limit;	
            if (timestamp) {
               archivesUrl += '&startkey=' + timestamp;
            }
         }

         return archivesUrl;
      },
      isArchiveSameDateAsPrevious: function (archive, index) {
         if (index === 0) {
            return false;
         }

         var previous = this.archives[index-1];

         var date1 = dateformat(archive.timestamp, 'mmm d, yyyy');
         var date2 = dateformat(previous.timestamp, 'mmm d, yyyy');

         return date1 === date2;
      },
      select: function (archive) {
         if (archive.justDeselected) {
            // HACK: So right now whenever we call deselect,
            // the click event also bubbles up (or whatever)
            // to this method.
            archive.justDeselected = undefined;
            return;
         }

         // Do not refocus stuff if we're already on this archive.
         if (!archive.isSelected) {
            // Hide the previously-selected archive
            if (this.selectedArchive) {
               this.selectedArchive.isSelected = false;
            }

            archive.isSelected = true;
            this.selectedArchive = archive;
         }
      },
      deselect: function (archive) {
         if (archive && archive.isSelected) {
            archive.isSelected = false;
            archive.justDeselected = true;

            this.selectedArchive = undefined;
         }
      },
      reverse: function (arr) {
         if (!arr) {
               return [];
         }
         return arr.slice().reverse();
      },
      showArchivesAt: function (timestamp) {
         var self = this;
         var archivesUrl = this.getArchivesUrl(this.projectId, this.perPageLimit, timestamp);
         $http.get(archivesUrl)
         .then(function (res) {
            var archives = res.data;
            self.archives = self.archives.concat(archives);
            if (self.hasMoreArchives) {
               self.lastArchiveOnPage = archives.pop();
            }
         })
         .catch(function (res) {
            errors.log(res.data, res.status);
         });
      },
      linky: function (text) {
         var options = {
               allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
               allowedAttributes: {
                  'a': [ 'href' ]
               }
         };

         return Autolinker.link(sanitizeHtml(text, options));
      }
   },
   filters: {
      date: function (timestamp) {
         var date = new Date(timestamp);
         var now = new Date();
         var filter = "";

         if (now.getFullYear() === date.getFullYear()) {
            filter = 'mmm d';
         }
         else {
            filter = 'mmm d, yyyy';
         }

         return dateformat(timestamp, filter);
      }
   },
   created: function () {
      var self = this;
      var archivesUrl = this.getArchivesUrl(this.projectId, this.perPageLimit); 

      $http.get(archivesUrl)
      .then(function (res) {
         var archives = res.data;
         if (archives.length >= self.perPageLimit) {
            self.lastArchiveOnPage = archives.pop();
         }
         archives.forEach(function (archive) {
            archive.isSelected = false;
            archive.createdBy = archive.createdBy || {}
         });
         self.archives = archives;
      })
      .catch(function (res) {
         errors.log(res.data, res.status);
      });

      $http.get('/data/' + this.projectId + '/archives/count')
      .then(function (res) {
         self.totalArchivesCount = res.data;
      })
      .catch(function (res) {
         errors.log(res.data, res.status);
      });
   }
}
</script>