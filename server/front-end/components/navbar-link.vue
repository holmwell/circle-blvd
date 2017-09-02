<template lang="pug">
  li
    a.jsLink(@click="$emit('click')"
      data-toggle="collapse" 
      data-target="#navigation-circles.in")
      slot
</template>

<script>
export default {
  name: 'navbar-link'
}
</script>