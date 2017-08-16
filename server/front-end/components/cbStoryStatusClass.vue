<script>
module.exports = {
    props: {
        isDeadline: Boolean,
        isNextMeeting: Boolean,
        status: String
    },
    computed: {
        statusClass: function () {
            if (this.isDeadline) {
                return "deadline";
            }

            if (this.isNextMeeting) {
                return "next-meeting";
            }

            switch (this.status) {
                case "sad":
                case "assigned":
                case "active":
                case "done":
                    return this.status;
                default: 
                    return "new";
            }
        }
    }
};
</script>

<template lang="pug">
    div(:class="statusClass")
        slot
</template>