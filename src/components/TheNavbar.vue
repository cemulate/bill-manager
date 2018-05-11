<template>
    <nav class="navbar is-primary">
        <div class="navbar-brand">
            <a class="navbar-item"><strong>Bill Manager</strong></a>
            <a role="button" class="navbar-burger" v-on:click="displayNavbarMenu = !displayNavbarMenu">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>
        <div class="navbar-menu" v-bind:class="{'is-active': displayNavbarMenu && user != null}" v-if="user != null">
            <div class="navbar-start">
            </div>
            <div class="navbar-end">
                <div class="navbar-item has-dropdown is-hoverable">
                    <a class="navbar-link">{{ user.firstName }}</a>
                    <div class="navbar-dropdown">
                        <a class="navbar-item" v-on:click="$emit('logout')">Logout</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>

<script>
export default {
    data: () => ({
        displayNavbarMenu: false,
    }),
    props: {
        user: Object,
    },
    watch: {
        user(val) {
            // Unexapand menu upon log(in|out)
            this.displayNavbarMenu = false;
        }
    }
}
</script>
