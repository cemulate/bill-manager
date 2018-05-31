<template>
<div class="modal" v-bind:class="{ 'is-active': show }">
    <div class="modal-background" v-on:click="$emit('close')"></div>
    <div class="modal-content">
        <div class="box">
            <div class="content">
                <p>Are you sure you want to delete <strong>{{ target }}</strong>?</p>
                <p v-if="extraWarning != null">{{ extraWarning }}</p>
                <p><button class="button is-fullwidth is-danger" v-on:click="$emit('delete')">Yes, delete it</button></p>
                <p><button class="button is-fullwidth" v-on:click="$emit('close')">No, don't delete it</button></p>
            </div>
        </div>
    </div>
    <button class="modal-close is-large" v-on:click="$emit('close')"></button>
</div>
</template>

<script>
export default {
    data: () => ({

    }),
    props: {
        show: Boolean,
        target: String,
        extraWarning: String,
    },
}
</script>
