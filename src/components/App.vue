<template>
<div id="root">

<the-navbar v-bind:user="user" v-on:logout="logout"></the-navbar>

<section class="section" v-if="user == null">
<div class="container">

    <div class="columns is-centered">
        <div class="column is-4" v-if="$apollo.queries.user.loading">
            <p class="has-text-centered">
                <font-awesome-icon icon="spinner"></font-awesome-icon>
            </p>
        </div>
        <div class="column is-4" v-else>
            <login-box v-bind:problem="loginProblem" v-on:login="login"></login-box>
        </div>
    </div>

</div>
</section>

<section class="section" v-if="user != null">
<div class="container">

    <div class="columns">
        <div class="column is-4">
            <group-select 
              v-bind:user="user"
              v-bind:selectedGroup="group" 
              v-on:select-group="selectGroup"
            >
            </group-select>
        </div>
        <div class="column is-8" v-if="group != null">
            <group-detail
              v-bind:groupId="group.id"
            >
            </group-detail>
        </div>
    </div>

</div>
</section>

</div>
</template>

<script>

import gql from 'graphql-tag';

import AuthenticateMutation from '../graphql/mutations/Authenticate.gql';
import UserQuery from '../graphql/queries/User.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faSpinner } from '@fortawesome/fontawesome-free-solid';

import TheNavbar from './TheNavbar.vue';
import LoginBox from './LoginBox.vue';
import GroupSelect from './GroupSelect.vue';
import GroupDetail from './GroupDetail.vue';

export default {
    data: () => ({
        user: null,
        loginProblem: false,

        group: null,
    }),
    apollo: {
        user: {
            query: UserQuery,
            update: data => data.currentPerson,
            error(err) {
                this.user = null;
            },
        },
    },
    methods: {
        async login(loginInfo) {
            this.loginProblem = false;
            try {
                let loginResult = await this.$apollo.mutate({ mutation: AuthenticateMutation, variables: loginInfo });
                let token = loginResult.data.authenticate.jwtToken;
                window.localStorage.setItem('token', token);
                this.$apollo.queries.user.refetch();
            } catch (err) {
                this.loginProblem = true;
                this.logout();
            }
        },
        logout() {
            window.localStorage.removeItem('token');
            this.$apollo.provider.defaultClient.cache.reset();
            this.$apollo.queries.user.refresh();
        },
        selectGroup(group) {
            this.group = group;
        },
    },
    components: {
        FontAwesomeIcon,
        TheNavbar,
        LoginBox,
        GroupSelect,
        GroupDetail,
    }
}
</script>