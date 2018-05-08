<template>
    <nav class="navbar is-primary">
        <div class="navbar-brand">
            <a class="navbar-item"><strong>Bill Manager</strong></a>
        </div>
        <div class="navbar-menu">
            <div class="navbar-start">
            </div>
            <div class="navbar-end">
                <div class="navbar-item has-dropdown is-hoverable" v-if="user != null">
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
    props: {
        user: Object
    }
}
</script>
