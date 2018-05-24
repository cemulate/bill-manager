<template>
<div class="field">
    <div class="field has-addons">
        <p class="control" v-if="!redeemMode">
            <a
              class="button is-link"
              v-bind:class="{ 'is-loading': gettingInvite }"
              v-on:click="getInvite"
            >
                Generate an invite code for this group
            </a>
        </p>
        <p class="control is-expanded">
            <input
              class="input"
              v-bind:class="{ 'has-background-light': !redeemMode }"
              type="text"
              v-bind:readonly="!redeemMode"
              v-model="code"
              spellcheck="false"
            >
        </p>
        <p class="control" v-if="redeemMode">
            <a
              class="button is-link"
              v-bind:class="{ 'is-loading': gettingInvite }"
              v-on:click="redeemInvite"
            >
                Join Group
            </a>
        </p>
    </div>
    <p class="help is-danger" v-if="message != null">
        {{ message }}
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
