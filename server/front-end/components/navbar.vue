<template lang="pug">
	.navbar.navbar-inverse.topMenu(role="navigation")
		.container-fluid
			.navbar-header
				button.navbar-toggle(type="button" data-toggle="collapse" data-target="#navigation-circles")
					span.sr-only Show circles
					span.icon-bar
					span.icon-bar
					span.icon-bar

				a.navbar-brand(href="/")
					span.circle
						img(src="/img/glyphs/icon-white-circle.svg")

				.navbar-title.visible-xs
					h2 {{member.activeCircle.name}}

			.collapse.navbar-collapse#navigation-circles
				ul.nav.navbar-nav
					li(v-for="circle in member.circles" v-if="!circle.isArchived")
							a(:href="'/o/' + circle.id"
								data-toggle="collapse" 
								data-target="#navigation-circles.in") {{circle.name}}

				ul.nav.navbar-nav.navbar-right
					li(v-if="member.hasMainframeAccess")
						a(href="/#/mainframe" 
							data-toggle="collapse" 
							data-target="#navigation-circles.in") Mainframe access

					li
						a(href="/tips" 
							data-toggle="collapse" 
							data-target="#navigation-circles")
							span.glyphicon.glyphicon-flash

					li
						a(href="/tour" 
							data-toggle="collapse" 
							data-target="#navigation-circles.in") Tour

					li
						a(href="/#/profile" 
							data-toggle="collapse" 
							data-target="#navigation-circles.in") Profile

					li
						a.jsLink(@click="$emit('signout')" 
							data-toggle="collapse" 
							data-target="#navigation-circles.in") Sign out 
</template>

<script>
	export default {
		name: 'navbar',
		props: ['circleId', 'member'],
	}
</script>
