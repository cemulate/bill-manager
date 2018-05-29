<template>
<div class="field">
    <div class="field has-addons">
        <p class="control" v-if="!redeemMode">
            <button
              class="button is-link"
              v-bind:class="{ 'is-loading': gettingInvite }"
              v-on:click="getInvite"
            >
                Generate
            </button>
        </p>
        <p class="control is-expanded">
            <input
              id="code-input"
              class="input monospace"
              v-bind:class="{ 'has-background-light': !redeemMode }"
              type="text"
              v-bind:readonly="!redeemMode"
              v-model="code"
              spellcheck="false"
            >
        </p>
        <p class="control" v-if="redeemMode">
            <button
              class="button is-link"
              v-bind:class="{ 'is-loading': gettingInvite }"
              v-on:click="redeemInvite"
            >
                Join Group
            </button>
        </p>
    </div>
    <p class="help" v-bind:class="{ 'is-danger': message != null }">
        <span v-if="message != null">{{ message }}</span>
        <span v-if="message == null && !redeemMode">Generate an invite code that others can use to join this group for 1 hour</span>
        <span v-if="message == null && redeemMode">Join a group using an invite code</span>
    </p>
</div>
</template>

<script>
import GetGroupInviteMutation from '../graphql/mutations/GetGroupInvite.gql';
import RedeemGroupInviteMutation from '../graphql/mutations/RedeemGroupInvite.gql';

export default {
    data: () => ({
        gettingInvite: false,
        code: '',
        message: null,
    }),
    props: {
        groupId: Number,
        redeemMode: {
            type: Boolean,
            default: false,
        },
    },
    methods: {
        async getInvite() {
            try {
                let result = await this.$apollo.mutate({ mutation: GetGroupInviteMutation, variables: { groupId: this.groupId } });
                this.code = result.data.makeInviteCodeForGroup.code;
                window.setTimeout(() => document.getElementById('code-input').select(), 1);
            } catch (err) {
                console.error(err);
            }
        },
        async redeemInvite() {
            try {
                let result = await this.$apollo.mutate({ mutation: RedeemGroupInviteMutation, variables: { code: this.code } });
                this.$emit('invite-redeemed', result.data.redeemInviteCodeForGroup.group.id);
            } catch (err) {
                if (err.graphQLErrors.length > 0) {
                    this.message = err.graphQLErrors[0].message;
                } else {
                    this.message = 'Could\'nt redeem invite';
                }
            }
        }
    }
};

export {

}
</script>
