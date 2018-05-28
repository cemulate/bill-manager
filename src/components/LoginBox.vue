<template>
<div id="root">

<div class="notification is-success" v-if="successfullyRegistered">
    <button class="delete" v-on:click="successfullyRegistered = false"></button>
    Your account was created! Log in here:
</div>
<form v-on:submit.prevent="registerOrLogin" method="post">
    <div class="field">
        <label class="label"><span v-if="registerMode">*&nbsp;</span>Email</label>
        <div class="control">
            <input name="email" type="text" class="input" placeholder="Email" v-model.trim="loginInfo.email" maxlength="50" autocomplete="username email">
        </div>
        <p class="help is-danger" v-if="registerMode && !emailValid">Enter a valid email address</p>
    </div>
    <div class="field">
        <label class="label"><span v-if="registerMode">*&nbsp;</span>Password</label>
        <div class="control">
            <input name="password" type="password" class="input" placeholder="Password" v-model="loginInfo.password" maxlength="50" autocomplete="password">
        </div>
    </div>
    <div v-if="registerMode">
        <div class="field">
            <label class="label">*&nbsp; Confirm Password</label>
            <div class="control">
                <input type="password" class="input" placeholder="Password" v-model="registerInfo.confirmPassword">
            </div>
            <p class="help is-danger" v-if="!passwordsMatch">Password doesn't match</p>
        </div>
        <div class="field">
            <label class="label">*&nbsp; Username (display name)</label>
            <div class="control">
                <input type="text" class="input" placeholder="First Name" v-model.trim="registerInfo.username">
            </div>
        </div>
        <div id="recaptcha-container" class="g-recaptcha" v-if="registerMode" data-sitekey="6LczWlsUAAAAAHeP9Nc5TN9BTupko6zpRf06QtDZ" style="margin-bottom: 10px"></div>
    </div>
    <div class="field">
        <div class="control">
            <input
              type="submit"
              class="button is-primary is-fullwidth"
              v-bind:class="{ 'is-loading': busy }"
              v-bind:value="registerMode ? 'Create Account' : 'Login'"
              v-bind:disabled="registerMode && !formValid"
            >
        </div>
    </div>
    <div class="notification is-danger" v-if="errorMessage != null">
        There was a problem with your email or password.
        Please try again.
    </div>
</form>
<hr>
<a v-on:click="registerMode = !registerMode">
    <font-awesome-icon icon="user-plus"></font-awesome-icon> &nbsp; {{ registerMode ? 'Login with existing account' : 'Register a new account' }}
</a>

</div>
</template>

<script>
import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faUserPlus } from '@fortawesome/fontawesome-free-solid';

import AuthenticateMutation from '../graphql/mutations/Authenticate.gql';
import RegisterUserMutation from '../graphql/mutations/RegisterUser.gql';

export default {
    data: () => ({
        loginInfo: {
            email: '',
            password: '',
        },
        registerInfo: {
            confirmPassword: '',
            username: '',
        },
        extraInfo: {
            firstName: '',
            lastName: '',
        },
        recaptchaResponse: null,

        _renderedRecaptcha: false,
        registerMode: false,

        busy: false,
        errorMessage: null,
        successfullyRegistered: false,
    }),
    updated() {
        if (this.registerMode && !this._renderedRecaptcha) {
            window.grecaptcha.render('recaptcha-container', {
                callback: response => this.recaptchaResponse = response,
            });
            this._renderedRecaptcha = true;
        } else if (!this.registerMode) {
            this._renderedRecaptcha = false;
        }
    },
    computed: {
        emailValid() {
            return /.+@.+\..+/.test(this.loginInfo.email);
        },
        passwordsMatch() {
            return this.loginInfo.password == this.registerInfo.confirmPassword;
        },
        formValid() {
            return this.emailValid && this.passwordsMatch;
        },
    },
    methods: {
        async registerOrLogin() {
            await (this.registerMode ? this.register() : this.login());
        },
        async login() {
            window.localStorage.removeItem('token');
            this.busy = true;
            try {
                let loginResult = await this.$apollo.mutate({ mutation: AuthenticateMutation, variables: this.loginInfo });
                let token = loginResult.data.authenticate.jwtToken;
                window.localStorage.setItem('token', token);
                this.$emit('logged-in');
            } catch (err) {
                this.errorMessage = 'There was a problem with your email or password. Please try again';
            } finally {
                this.busy = false;
            }
        },
        async register() {
            this.busy = true;
            let variables = { ...this.loginInfo, recaptchaResponse: this.recaptchaResponse, username: this.registerInfo.username };
            try {
                let registerResult = await this.$apollo.mutate({ mutation: RegisterUserMutation, variables });
                this.successfullyRegistered = true;
                this.registerMode = false;
            } catch (err) {
                this.errorMessage = 'There was a problem with your email or password. Please try again';
            } finally {
                this.busy = false;
            }
        },
    },
    components: {
        FontAwesomeIcon,
    },
}
</script>
