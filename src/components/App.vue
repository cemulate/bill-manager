<template>
<div id="root">

<the-navbar v-bind:user="user" v-on:logout="logout"></the-navbar>

<section class="section">
<div class="container">

    <div class="columns is-centered" v-if="user == null">
        <div class="column is-4" v-if="$apollo.queries.user.loading">
            <p class="has-text-centered">
                <font-awesome-icon icon="spinner"></font-awesome-icon>
            </p>
        </div>
        <div class="column is-4" v-else>
            <the-login v-bind:problem="loginProblem" v-on:login="login"></the-login>
        </div>
    </div>

</div>
</section>

</div>
</template>

<script>

import gql from 'graphql-tag';

import AuthenticationMutation from '../graphql/mutations/Authentication.gql';
import UserQuery from '../graphql/queries/User.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faSpinner } from '@fortawesome/fontawesome-free-solid';

import TheNavbar from './TheNavbar.vue';
import TheLogin from './TheLogin.vue';

export default {
    data: () => ({
        user: null,
        loginProblem: false,
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
            let loginResult = await this.$apollo.mutate({ mutation: AuthenticationMutation, variables: loginInfo });
            if (loginResult.errors == null) {
                if (loginResult.data.authenticate.jwtToken != null) {
                    let token = loginResult.data.authenticate.jwtToken;
                    window.localStorage.setItem('token', token);
                    this.$apollo.queries.user.refresh();
                } else {
                    this.loginProblem = true;
                }
            }
        },
        logout() {
            window.localStorage.removeItem('token');
            this.$apollo.provider.defaultClient.cache.reset();
            this.$apollo.queries.user.refresh();
        },
    },
    components: {
        FontAwesomeIcon,
        TheNavbar,
        TheLogin,
    }
}
</script>