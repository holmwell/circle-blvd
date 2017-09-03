'use strict';

function href(url) {
   window.location.href = url;
}

function nav(destination) {
   switch (destination) {
      case 'admin':
      case 'mainframe':
      case 'profile':
      case 'archives':
      case 'lists':
         href('/#/' + destination);
         break;
      case 'home':
         href('/');
         break;
      default: 
         href('/' + destination);
         break;
   }
}

export default {
   nav: nav
}