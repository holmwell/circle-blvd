<template>
<div class="content admin text-select">
   <p v-show="!isSignedIn">Please <a href="/signin">sign in</a>.</p>
   <div v-show="isSignedIn" class="hidden-xs">
      <form>
         <h4 class="first">Circle name</h4>
         <div class="row">
            <div class="col-sm-5">
               <input v-model="circleName" class="form-control" type="text" placeholder="Circle name"/>
            </div>
            <div class="col-sm-2">
               <button class="btn btn-default" 
               @click="saveCircleName(circleName)">Save</button>
               <span>&nbsp;{{messages.name}}</span>
            </div>
         </div>
      </form>

      <form>
         <h4>Milepost colors</h4>
         <div class="row">
            <div class="col-sm-5">
               <input v-model="milepostBackground" class="form-control" type="text" placeholder="Background"/>
            </div>
            <div class="col-sm-4 subtle">(e.g. gold or #990000)</div>
         </div>
         <div class="row">
            <div class="col-sm-5">
               <input v-model="milepostForeground" class="form-control" type="text" placeholder="Foreground"/>
            </div>
            <div class="col-sm-2">
               <button class="btn btn-default" 
               @click="saveMilepostColors(milepostBackground, milepostForeground)">Save</button>
               <span>&nbsp;{{messages.milepostColors}}</span>
            </div>
         </div>
         <p v-show="messages.milepostColors">Note, you'll have to refresh the page for
            the colors to take effect.</p>
      </form>

      <form name="inviteForm">
         <h4>Invite people</h4>
         <div class="row">
            <div class="col-sm-8 col-md-7">
               <p>Add people to your circle by sending them links to join.
               Each invitation link is good for one invite, and will expire 
               after 5 days.</p>

               <p class="v-cloak" v-if="isNotificationEnabled">If you specify an email 
               address, we'll try emailing the invitation. If you don't 
               specify an address, you will need to send the invitation 
               URL to them by some other means (e.g. iMessage, Facebook).</p>
            </div>
         </div>

         <div class="row">
            <div class="col-sm-5">
               <input v-model="invite.name" class="form-control" type="text" placeholder="Name"/>
            </div>
            <div class="col-sm-2">
               <button v-if="!isNotificationEnabled" class="btn btn-default"
                  @click="createInvite(invite.name)">Create invite</button>
            </div>
         </div>
         <div class="row" v-if="isNotificationEnabled" >
            <div class="col-sm-5">
               <input v-model="invite.email" class="form-control" type="email" placeholder="Email (optional)"/>
            </div>

            <div class="col-sm-2">
               <button class="btn btn-default"
               @click="createInvite(invite.name, invite.email)">Create invite</button>
            </div>
         </div>
         
      </form>

      <div v-show="invites.length > 0">
         <h4>Open invitations</h4>
         <ul class="adminList">
            <li>
               <div class="row">
                  <div class="col-xs-4">
                     <h5>Name</h5>
                  </div>
                  <div class="col-xs-7">
                     <h5>Invite link</h5>
                  </div>
               </div>
            </li>
            <li v-for="(invite, index) in invites" :class="{'odd': (index % 2 !== 0) }">
               <div class="row">
                  <div class="col-xs-4">
                     <div>
                        {{invite.name}} 
                        <span v-show="invite.email">&lt;{{invite.email}}&gt;</span>
                     </div>
                  </div>
                  <div class="col-xs-7">
                     <div>{{ getInviteUrl(invite) }}</div>
                  </div>
                  <div class="col-xs-1"><a :href="getInviteUrl(invite)">view</a></div>
               </div>
            </li>
         </ul>
      </div>

      <h4>Member list</h4>
      <ul class="adminList">
         <li v-for="(member, index) in members" :class="{'odd': (index % 2 !== 0) }">
            <div class="row">
               <div class="name col-sm-3">{{member.name}}</div>
               <div class="email col-sm-3">{{member.notifications.email || member.email}}</div>
               <div class="roles col-sm-3">
                  <span v-for="membership in member.memberships">
                     {{getGroupName(membership.group)}}
                  </span>
               </div>
               <div class="col-sm-2">
                  <a class="jsLink" @click="showDetails(member)">Edit details</a>
               </div>
               <div class="removeMember col-sm-1" @click="removeMember(member)" title="remove member"><i class="glyphicon glyphicon-trash"></i></div>
            </div>
            <div class="row" v-cloak v-show="isShowing(member)">
               <div class="col-xs-12">
                  <div><strong>Groups</strong></div>
                  <div v-for="group in groups">
                     <div class="checkbox" v-show="!isGroupImplied(group)">
                        <label><input type="checkbox" v-model="member.groups[group.id]"> {{group.name}}</label>
                     </div>
                  </div>
                  <button class="btn btn-default" @click="saveGroups(member)">Save {{member.name}}'s groups</button>
               </div>
            </div>
         </li>
      </ul>

      <form>
         <h4>Integrations (Webhooks)</h4>
         <div class="row">
            <div class="col-sm-5">
               <input v-model="slackUrl" class="form-control" type="text" placeholder="https://hooks.slack.com/..."/>
            </div>
            <div class="col-sm-2">
               <button class="btn btn-default" 
               @click="saveSlackUrl(slackUrl)">Save</button>
               <span>&nbsp;{{messages.slackUrl}}</span>
            </div>
         </div>
      </form>

      <form>
         <h4>Archive circle</h4>
         <div class="row">
            <p class="col-sm-7">Hide the circle from the top navbar, for all members. The circle will still be accessible from the <a href="/#/profile">profile page</a>,
            and it can still be edited.</p>
         </div>

         <div class="checkbox">
            <label>
               <input type="checkbox" v-model="isArchived"> Archive
            </label>
         </div>
      </form>

      <!-- <form id="groupForm">
         <h4>Groups</h4>
         <div class="row">
            <div class="col-sm-3"><input type="text" ng-model="groupName" 
               placeholder="Name" class="form-control" /></div>
            <div class="col-sm-2"><button class="btn btn-default" ng-click="addGroup(groupName)">Add group</button></div>
         </div>
         <ul class="adminList">
            <li ng-repeat="group in groups" ng-class-odd="'odd'">
               <div class="row" ng-hide="isGroupImplied(group)">
                  <div class="name col-sm-3">{{group.name}}</div>
                  <div class="removeUser col-sm-2" ng-hide="group.isPermanent" ng-click="removeGroup(group)" title="remove group"><i class="glyphicon glyphicon-trash"></i></div>
               </div>
            </li>
         </ul>
      </form> -->
   </div>
   <div class="visible-xs">Please use a larger screen for administrative things, for now. :-)</div>
</div>
</template>

<script>
import $http from 'axios'
import errors from './lib/errors'

export default {
   props: {
      listMeta: Object
   },
   data: function() {
      return {
         circleName: null,
         groupNames: {},
         groups: [],
         impliedGroup: undefined,
         invite: {
            name: null,
            email: null
         },
         invites: [],
         isArchived: false,
         isCreatingInvite: false,
         isSignedIn: true,
         members: [],
         memberGroups: {},
         messages: {
            name: "",
            milepostColors: "",
            slackUrl: ""
         },
         milepostBackground: null,
         milepostForeground: null,
         selectedMember: undefined,
         slackUrl: null,
         successes: {}
      }
   },
   computed: {
      circleId: function () {
         return this.listMeta.listId;
      }
   },
   methods: {
      getBaseUrl: function () {
         var location = window.location;
         return location.protocol + '//' + location.host;
      },
      getCircleData: function () {
         var self = this;
         $http.get('/data/circle/' + this.circleId)
         .then(getCircleSuccess)
         .catch(errors.log);

         function getCircleSuccess(res) {
            var data = res.data;
            self.circleName = data.name;
            self.isArchived = data.isArchived || false;
            if (data.colors) {
               self.milepostBackground = data.colors.mileposts.background;
               self.milepostForeground = data.colors.mileposts.foreground;
            }
            if (data.webhooks) {
               self.slackUrl = data.webhooks.slack.url;
            }
            console.log(data);
         }
      },
      saveCircleName: function (circleName) {
         var self = this;
         var data = {
            name: circleName
         };
         $http.put('/data/circle/' + this.circleId + '/name', data)
         .then(function () {
            self.messages.name = "Ok!";
            // TODO: Emit an event and catch it at TopLevelCtrl,
            // instead of a full page refresh.
            // $route.reload();
         })
         .catch(errors.handle);
      },
      saveMilepostColors: function (background, foreground) {
         var self = this;
         var data = {
            background: background,
            foreground: foreground
         };
         $http.put('/data/circle/' + this.circleId + '/colors/mileposts', data)
         .then(function () {
            self.messages.milepostColors = "Ok!";
         })
         .catch(errors.handle);
      },
      saveSlackUrl: function (slackUrl) {
         var self = this;
         var data = {
            url: slackUrl
         };
         $http.put('/data/circle/' + this.circleId + '/webhooks/slack', data)
         .then(function () {
            self.messages.slackUrl = "Ok!";
         })
         .catch(errors.handle);
      },
      getInviteUrl: function (invite) {
         return this.getBaseUrl() + '/invite/' + invite._id;
      },
      createInvite: function (inviteName, inviteEmail) {
         var self = this;
         if (this.isCreatingInvite) {
            return;
         }
         this.isCreatingInvite = true;

         var inviteData = {};
         inviteData.name = inviteName;
         if (inviteEmail) {
            inviteData.email = inviteEmail;
         }

         $http.post('/data/circle/' + this.circleId + '/invite', inviteData)
         .then(function (res) {
            var data = res.data;
            self.inviteUrl = self.getInviteUrl(data);
            self.isCreatingInvite = false;
            self.getLatestInviteData();
            // Reset the UI
            self.invite.name = null;
            self.invite.email = null;
         })
         .catch(function (res) {
            self.isCreatingInvite = false;
            errors.handle(res);
         });
      },
      // TODO: Refactor. This is also defined in story.js
      isNotificationEnabled: function () {
         // TODO: ...
         // if (session.settings && session.settings['smtp-enabled'].value) {
         //    return true;
         // }
         return false;
      },
      isGroupImplied: function (group) {
         if (group && group.name) {
            return group.name === "_implied";
         }
         return false;
      },
      removeMember: function (member) {
         var self = this;
         $http.put('/data/circle/' + this.circleId + '/member/remove', member)
         .then(function() {
            self.getLatestMemberData();
         })
         .error(errors.handle);
      },
      saveGroups: function (member) {
         var self = this;
         $http.put('/data/circle/' + this.circleId + '/member/groups', member)
         .then(function () {
            self.getLatestMemberData();
            self.selectedMember = undefined;
         })
         .error(errors.handle);
      },
      showDetails: function (member) {
         this.selectedMember = member;
      },
      isShowing: function (member) {
         if (!this.selectedMember) {
            return false;
         }

         return member._id === this.selectedMember._id;
      },
      isInGroup: function (member, groupName) {
         for (var key in member.memberships) {
            var membership = member.memberships[key];
            var group = this.groupNames[membership.group];
            if (group && group.name === groupName) {
               return true;
            }
         }
         return false;
      },
      processMemberGroups: function () {
         if (!this.successes.members || !this.successes.groups) {
            return;
         }

         var members = this.members;
         var groups = this.groups;

         for (var key in members) {
            var member = members[key];
            member.groups = {};
            for (var groupKey in groups) {
               var group = groups[groupKey];
               if (this.isInGroup(member, group.name)) {
                  member.groups[group.id] = true;
               }
            }
         }
      },
      getMembersSuccess: function(res) {
         if (res.data === {}) {
            // do nothing. 
         }
         else {
            this.members = res.data;
         }
         this.successes.members = true;
         this.processMemberGroups();
      },
      getMembersFailure: function(res) { 
         if (res.status === 401 && this.isSignedIn()) {
            // && is admin ...
            this.$emit('signout');
            // "The server was restarted. Please sign in again."
         }
      },
      getLatestMemberData: function() {
         $http.get('/data/circle/' + this.circleId + '/members')
         .then(this.getMembersSuccess)
         .catch(this.getMembersFailure);
      },
      getInvitesSuccess: function (res) {
         var data = res.data;
         if (!data || data.length === 0) {
            // do nothing. 
         }
         else {
            // Sort by expiration, newest on top
            data.sort(function (a, b) {
               if (a.expires < b.expires) {
                  return 1;
               }
               if (a.expires > b.expires) {
                  return -1;
               }
               return 0;
            });
            this.invites = data;
         }
      },
      getLatestInviteData: function () {
         $http.get('/data/circle/' + this.circleId + '/invites')
         .then(this.getInvitesSuccess)
         .catch(errors.log);
      },
      getGroupName: function (groupId) {
         var group = this.groupNames[groupId];
         if (this.isGroupImplied(group)) {
            return;
         }
         if (group) {
            return group.name;
         }
      },
      getGroupsSuccess: function (res) {
         var data = res.data;
         if (data === {}) {
            // do nothing. 
         }
         else {
            this.groups = data;

            this.groupNames = {};
            for (var groupKey in data) {
               var group = data[groupKey];
               this.groupNames[group.id] = group;

               if (this.isGroupImplied(group)) {
                  this.impliedGroup = group;
               }
            }
         }
         this.successes.groups = true;
         this.processMemberGroups();
      },
      getLatestGroupData: function () {
         $http.get('/data/' + this.circleId + '/groups')
         .then(this.getGroupsSuccess)
         .catch(errors.handle);
      },
      addGroup: function (groupName) {
         var self = this;
         var data = {
            name: groupName,
            projectId: this.circleId // TODO: Notion of projects inside groups, yes?
         };

         $http.post('/data/group', data)
         .then(function () {
            self.groupName = "";
            self.getLatestGroupData();
         })
         .catch(errors.handle);
      },
      removeGroup: function (group) {
         var self = this;
         $http.put('/data/group/remove', group)
         .then(function() {
            self.getLatestGroupData();
         })
         .catch(errors.handle);
      }
   },
   watch: {
      isArchived: function (newVal, oldVal) {
         if (newVal === oldVal || typeof oldVal === 'undefined') {
            return;
         }

         var data = {
            isArchived: newVal
         };
         $http.put('/data/circle/' + this.circleId + '/archive', data).then(function() {
            // TODO: Re-fetch data
            // $route.reload();
         })
         .catch(errors.handle);
      }
   },
   created: function () {
      this.getCircleData();
      this.getLatestMemberData();
      this.getLatestGroupData();
      this.getLatestInviteData();
   }
}
</script>