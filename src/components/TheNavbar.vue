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
import CurrentPersonQuery from '../graphql/queries/CurrentPerson.gql';

export default {
    data: () => ({
        displayNavbarMenu: false,
        user: Object,
    }),
    props: {
        
    },
    apollo: {
        user: {
            query: CurrentPersonQuery,
            update: data => data.currentPerson,
            error(err) {
                this.user = null;
            },
        },
    },
    watch: {
        user(val) {
            // Unexapand menu upon log(in|out)
            this.displayNavbarMenu = false;
        }
    }
}
</script>
