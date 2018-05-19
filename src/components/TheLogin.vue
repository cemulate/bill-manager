<template>
<div class="box">
    <form v-on:submit.prevent="$emit('login', loginInfo)">
        <div class="field">
            <label class="label">Email</label>
            <div class="control">
                <input type="text" class="input" placeholder="Email" v-model="loginInfo.email">
            </div>
        </div>
        <div class="field">
            <label class="label">Password</label>
            <div class="control">
                <input type="password" class="input" placeholder="Password" v-model="loginInfo.password">
            </div>
        </div>
        <div class="field">
            <div class="control">
                <input type="submit" class="button is-fullwidth" value="Login">
            </div>
        </div>
        <div class="notification is-danger" v-if="problem">
            There was a problem with your email or password.
            Please try again.
        </div>
    </form>
</div>
</template>

<script>
export default {
    props: {
        problem: Boolean,
    },
    data: () => ({
        loginInfo: {
            email: '',
            password: '',
        },
    }),
}
</script>

