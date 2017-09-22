<template>
<div class="content">
   <h3>Mainframe controls!</h3>
   <p v-show="!isSignedIn">Please <a href="/signin">sign in</a>.</p>

   <div v-show="isSignedIn">
      <form id="circleForm">
         <h4>Create circle</h4>
         <div class="row">
            <div class="col-xs-3">
               <div><input type="text" v-model="circle.name" 
                  placeholder="Circle name" class="form-control"/></div>
               <div><input type="email" v-model="circle.adminEmail" 
                  placeholder="Admin email address" class="form-control"/></div>
               <div><button class="btn btn-default" @click="addCircle(circle)">Add circle</button></div>
            </div>
         </div>
      </form>

      <h4>Metrics</h4>
      <ul class="adminList">
         <li>
            <div class="row">
               <div class="col-xs-12">Circles: {{circleCount}}</div>
            </div>
         </li>
         <li class="odd">
            <div class="row">
               <div class="col-xs-12">Members: {{memberCount}}</div>
            <!-- TODO: This metric isn't accurate. -->
            <!-- <div>Admins: {{adminCount}}</div> -->
            </div>
         </li>
      </ul>

      <h4>Active circles (last 8 months)</h4>
      <ul class="adminList">
         <li>
            <div class="row">
               <div class="col-xs-offset-3 col-xs-3">Last archive</div>
               <div class="col-xs-3">Archive count</div>
            </div>
         </li>
         <li v-for="(stat, index) in circleStats" :class="{'odd': index % 2 !== 0}">
            <div class="row">
               <div class="col-xs-3">{{stat.name}}</div>
               <div class="col-xs-3">{{stat.lastArchiveTimestamp}}</div>
               <div class="col-xs-3">{{stat.archiveCount}}</div>
            </div>
         </li>
      </ul>

      <h4>All circles</h4>
      <ul class="adminList">
         <li v-for="(circle, index) in circles" :class="{'odd': index % 2 !== 0}">
            <div class="row">
               <div class="col-xs-3">{{circle.name}}</div>
            </div>
         </li>
      </ul>

      <h4>Waitlist</h4>
      <ul class="adminList">
         <li v-for="(request, index) in waitlist" :class="{'odd': index % 2 !== 0}">
            <div class="waitlist-request">
               <div><em>{{request.circle}}</em></div>
               <div class="things">{{request.things}}</div>
               <div>{{request.email}}</div>
            </div>
         </li>
      </ul>
      <p v-show="waitlist.length === 0">(There are no waitlist requests at this time.)</p>

      <h4 id="settingForm" class="clear">Settings</h4>
      <div class="adminList">
         <div v-for="(setting, index) in settings" class="setting-row" :class="{'odd': index % 2 !== 0}">
            <form v-show="!isBooleanSetting(setting)">
               <div class="row">
                  <label class="name col-xs-2">{{setting.name}}</label>
                  <div class="col-xs-3" v-show="setting.visibility !== 'secret'">
                     <input type="text" v-model="setting.value" placeholder="Value" class="form-control"/>
                  </div>
                  <div class="col-xs-3" v-show="setting.visibility === 'secret'">
                     <input type="password" v-model="setting.value" placeholder="(secret)" class="form-control"/>
                  </div>
                  <div class="name col-xs-2">{{setting.visibility}}</div>
                  <div class="col-xs-2">
                     <button class="btn btn-default" @click="updateSetting(setting)">Save</button>
                  </div>
               </div>
            </form>


            <form v-show="isBooleanSetting(setting)">
               <div class="row">
                  <label class="name col-xs-2">{{setting.name}}</label>
                  <div class="col-xs-3">
                     <input type="checkbox" v-model="setting.value"/>
                  </div>
                  <div class="name col-xs-2">{{setting.visibility}}</div>
                  <div class="col-xs-2">
                     <button class="btn btn-default" @click="updateSetting(setting)">Save</button>
                  </div>
               </div>
            </form>
         </div>
      </div>
   </div>
</div>
</template>


<script>
import $http from 'axios'
import errors from './lib/errors.js'

var handleError = function (res) {
   console.log(res);
   errors.handle(res.data, res.status);
};

var circleStats = undefined;

export default {
   data: function () {
      return {
         adminCount: 0,
         circle: {
            name: null,
            adminEmail: null
         },
         circles: null,
         circleCount: 0,
         circleDict: null,
         circleStats: null,
         isSignedIn: true,
         memberCount: 0,
         settings: null,
         waitlist: []
      }
   },

   methods: {
      maybeUpdateStats: function () {
         var now = Date.now();
         if (circleStats && this.circleDict) {
            // We have circle stats and the circle dict. 
            // Combine the two.
            this.circleStats = [];
            for (var circleId in circleStats) {
               var stat = circleStats[circleId];
               var circle = this.circleDict[circleId];
               var lastArchiveDate = new Date(stat.max);
               var eightMonths = 1000 * 60 * 60 * 24 * 30 * 8;

               if (now - eightMonths < lastArchiveDate.getTime()) {
                  this.circleStats.push({
                     name: circle.name,
                     lastArchiveTimestamp: lastArchiveDate.toDateString(),
                     archiveCount: stat.count,
                     sortKey: stat.max
                  });

                  // Sort by most recently active
                  this.circleStats.sort(function (a, b) {
                     return b.sortKey - a.sortKey;
                  });
               }
            }
         }
      },
      getLatestCircleData: function () {
         var self = this;
         var getCirclesSuccess = function(res) {
            var data = res.data;
            if (data === {}) {
               self.circleCount = 0;
            }
            else {
               self.circle = {
                  name: null,
                  adminEmail: null
               };
               self.circles = data;
               self.circleCount = data.length;

               // Build a dictionary to tie in to the stats. This will
               // obviously not work with millions of circles, but let's 
               // take this one order of magnitude at a time.
               self.circleDict = {};
               for (var index in data) {
                  var circle = data[index];
                  self.circleDict[circle._id] = circle;
               }
               self.maybeUpdateStats();
            }
         };

         $http.get('/data/circles/all')
         .then(getCirclesSuccess)
         .catch(handleError);
      },
      addCircle: function (circle) {
         var data = {
            circle: {
               name: circle.name
            },
            admin: {
               email: circle.adminEmail
            }
         };

         $http.post('/data/circle/admin', data)
         .then(getLatestCircleData)
         .catch(handleError);
      },
      getLatestWaitlistData: function () {
         var self = this;
         var getWaitlistSuccess = function (res) {
            self.waitlist = res.data;
         }
         $http.get('/data/waitlist')
         .then(getWaitlistSuccess)
         .catch(handleError);
      },
      updateSetting: function (setting) {
         var self = this;
         $http.put('/data/settings/setting', setting)
         .then(function() {
            // TODO: Show a fading smiley face or something
            // to indicate success.
            self.getLatestSettingData();
         })
         .catch(handleError);
      },
      appendSettings: function(data) {
         if (data === {}) {
            // do nothing. 
         }
         else {
            if (!this.settings) {
               this.settings = {};
            }

            for (var key in data) {
               this.settings[key] = data[key];
            }
         }
      },
      getLatestSettingData: function() {
         var self = this;
         $http.get('/data/settings/authorized')
         .then(function (res) {
            self.appendSettings(res.data);
         })
         .catch(handleError);
      },
      isBooleanSetting: function(setting) {
         if (typeof(setting.value) === "boolean") {
            return true;
         }
         return false;
      }
   },

   created: function () {
      var self = this;
      this.getLatestCircleData();
      this.getLatestWaitlistData();
      this.getLatestSettingData();

      // TODO: Maybe combine these into one call?
      $http.get('/data/metrics/members/count')
      .then(function (res) {
         self.memberCount = res.data;
      });

      $http.get('/data/metrics/members/admins/count')
      .then(function (res) {
         self.adminCount = res.data;
      });

      $http.get('/data/metrics/circles/stats')
      .then(function (res) {
         circleStats = res.data;
         self.maybeUpdateStats();
      });
   }
}
</script>