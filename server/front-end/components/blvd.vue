<template lang="pug">
    //- 1. Top navbar
    //- 2. Circle header
    //- 3. Story list
    navbar(:circleId="circleId", :member="member" @signout="signOut")

</template>

<script>
import navbar from './navbar.vue'
import http from 'axios'

export default {
    name: 'blvd',
    components: { navbar },
    props: ['circleId', 'member'],

    methods: {
        signOut: function () {
            http.get('/auth/signout').then(function () {
                //resetSession();
                window.location.href = "/signin";
            });
        }
    }
}
</script>