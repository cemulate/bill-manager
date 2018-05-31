<template>
<div id="root">

<the-navbar v-bind:current-user="user" v-on:logout="logout"></the-navbar>

<section class="section" v-if="user == null && !attemptingToRestoreSession">
<div class="container">

    <div class="columns is-centered">
        <div class="column is-4">
            <login-box v-bind:problem="loginProblem" v-on:logged-in="fetchUser"></login-box>
        </div>
    </div>

</div>
</section>

<section class="section" v-if="user != null">
<div class="container">

    <div class="columns">
        <div class="column is-4">
            <group-select
              v-bind:selected-group-id="selectedGroupId"
              v-on:select-group="selectGroup"
            >
            </group-select>
        </div>
        <div class="column is-8">
            <group-detail
              v-if="selectedGroupId != null"
              v-bind:current-user="user"
              v-bind:groupId="selectedGroupId"
              v-on:deleted="selectedGroupId = null"
            >
            </group-detail>
            <template v-if="selectedGroupId == null">
                <group-invite
                  v-if="selectedGroupId == null"
                  v-bind:redeem-mode="true"
                  v-on:invite-redeemed="selectGroup"
                >
                </group-invite>
            </template>
        </div>
    </div>

</div>
</section>

</div>
</template>

<script>
import gql from 'graphql-tag';

import CurrentPersonQuery from '../graphql/queries/CurrentPerson.gql';

import TheNavbar from './TheNavbar.vue';
import LoginBox from './LoginBox.vue';
import GroupSelect from './GroupSelect.vue';
import GroupDetail from './GroupDetail.vue';
import GroupInvite from './GroupInvite.vue';

export default {
    data: () => ({
        user: null,
        attemptingToRestoreSession: true,
        loginProblem: false,
        selectedGroupId: null,
    }),
    methods: {
        async fetchUser() {
            // This would normally be a smart query on the apollo object, but there
            // are too many problems using that approach when dealing with authentication
            let userResult = await this.$apollo.query({ query: CurrentPersonQuery });
            this.user = userResult.data.currentPerson;
        },
        logout() {
            window.localStorage.removeItem('token');
            this.user = null;
            this.selectedGroupId = null;
            this.$apollo.provider.defaultClient.cache.reset();
        },
        selectGroup(groupId) {
            this.selectedGroupId = groupId;
        },
    },
    async created() {
        // If a session exists
        if (window.localStorage.getItem('token') != null) {
            try {
                // It might still be good
                await this.fetchUser();
            } catch (err) {
            }
        }
        // We made an attempt
        this.attemptingToRestoreSession = false;
    },
    components: {
        TheNavbar,
        LoginBox,
        GroupSelect,
        GroupDetail,
        GroupInvite,
    }
}
</script>
