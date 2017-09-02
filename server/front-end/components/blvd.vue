<template lang="pug">
    //- 1. Top navbar
    //- 2. Circle header
    //- 3. Story list
    navbar(:circleId="circleId", :member="member" @nav="nav")

</template>

<script>
import navbar from './navbar.vue'
import http from 'axios'

export default {
    name: 'blvd',
    components: { navbar },
    props: ['circleId', 'member'],

    methods: {
        nav: function (destination) {
            switch (destination) {
                case 'signout':
                    this.signout();
                    break;
                case 'mainframe':
                case 'profile':
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

        signOut: function () {
            http.get('/auth/signout').then(function () {
                //resetSession();
                this.href("/signin");
            });
        }
    }
}
</script>