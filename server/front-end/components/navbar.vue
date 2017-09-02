<template lang="pug">
	.navbar.navbar-inverse.topMenu(role="navigation")
		.container-fluid
			.navbar-header
				button.navbar-toggle(type="button" 
					data-toggle="collapse" 
					data-target="#navigation-circles")
					span.sr-only Show circles
					span.icon-bar
					span.icon-bar
					span.icon-bar

				a.navbar-brand.jsLink(@click="nav('home')")
					span.circle
						img(src="/img/glyphs/icon-white-circle.svg")

				.navbar-title.visible-xs
					h2 {{member.activeCircle.name}}

			.collapse.navbar-collapse#navigation-circles
				ul.nav.navbar-nav
					navbar-link(v-for="circle in member.circles" v-if="!circle.isArchived"
						:class="activeIf(circle.id === circleId)"
						@click="circleNav(circle.id)") {{circle.name}}

				ul.nav.navbar-nav.navbar-right
					navbar-link(v-if="member.hasMainframeAccess" 
						@click="nav('mainframe')") Mainframe access

					navbar-link(@click="nav('tips')")
							span.glyphicon.glyphicon-flash

					navbar-link(@click="nav('tour')") Tour
					navbar-link(@click="nav('profile')") Profile
					navbar-link(@click="nav('signout')") Sign out
</template>

<script>
	import navbarLink from './navbar-link.vue'

	export default {
		name: 'navbar',
		components: { navbarLink },
		props: ['circleId', 'member'],

		methods: {
			circleNav: function (circleId) {
				this.nav('o/' + circleId);
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
