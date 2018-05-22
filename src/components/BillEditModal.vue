<template>
<div class="modal" v-bind:class="{ 'is-active': show }">
    <div class="modal-background" v-on:click="$emit('close')"></div>
    <div class="modal-card">
        <header class="modal-card-head">
            <p class="modal-card-title">Edit Bill</p>
        </header>
        <section class="modal-card-body" v-if="editData != null">
            <form class="form">
                <div class="field">
                    <label class="label">Name</label>
                    <div class="control">
                        <input type="text" class="input" v-model="editData.name" maxlength="80">
                    </div>
                </div>
                <div class="field">
                    <label class="label">Amount</label>
                    <p class="control has-icons-left">
                        <span class="icon is-left"><font-awesome-icon icon="dollar-sign"></font-awesome-icon></span>
                        <money class="input" v-model="editData.amount" v-bind:masked="true"></money>
                    </p>
                </div>
            </form>
            <div class="is-size-4">Bill Members</div>
            <hr>
            <div class="columns is-vcentered">
                <div class="column is-5"><strong>Name</strong></div>
                <div class="column is-3"><strong>Portion</strong></div>
                <div class="column is-2 has-text-centered"><strong>Paid</strong></div>
                <div class="column is-2"></div>
            </div>
            <div class="columns is-vcentered" v-for="user in augmentedParticipants" v-bind:key="user.id">
                <div class="column is-5">{{ user.bestIdentifier }}</div>
                <div class="column is-3">
                    <p class="control has-icons-right">
                        <input class="input" type="number" min="0" max="100" step="1" v-model="user.percent">
                        <span class="icon is-right"><font-awesome-icon icon="percent"></font-awesome-icon></span>
                    </p>
                </div>
                <div class="column is-2 has-text-centered">
                    <span class="is-size-4" v-bind:class="{ 'has-text-success': user.paid, 'has-text-grey-lighter': !user.paid }">
                        <font-awesome-icon v-if="user.paid" icon="check-square"></font-awesome-icon>
                    </span>
                </div>
                <div class="column is-2 has-text-right">
                    <a class="delete" v-if="currentUser.id == bill.ownerId" v-on:click="removeUserFromBill(user)">Remove</a> 
                </div>
            </div>
            <div class="columns">
                <div class="column is-12">
                    <div class="field has-addons" style="width: 100%">
                        <div class="control has-icons-left is-expanded">
                            <span class="icon is-left"><font-awesome-icon icon="plus"></font-awesome-icon></span>
                            <div class="select is-fullwidth">
                                <select v-model="selectedUserId">
                                    <option value="0"></option>
                                    <option v-for="user in nonParticipatingGroupMembers" v-bind:key="user.id" v-bind:value="user.id">{{ user.bestIdentifier }}</option>
                                </select>
                            </div>
                        </div>
                        <div class="control">
                            <a class="button is-link" v-on:click="addSelectedUserToBill()">Add</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <footer class="modal-card-foot">
            <button class="button is-success" v-on:click="saveChanges()">Save changes</button>
            <button class="button" v-on:click="$emit('close')">Cancel</button>
        </footer>
    </div>
    <button class="modal-close is-large" v-on:click="$emit('close')"></button>
</div>
</template>

<script>
import cloneDeep from 'lodash/cloneDeep';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faDollarSign, faCheckSquare, faPercent } from '@fortawesome/fontawesome-free-solid';

import { Money } from 'v-money';

import billUtil from '../util/bill.js';

import AddUsersToBillMutation from '../graphql/mutations/AddUsersToBill.gql';
import RemoveUsersFromBillMutation from '../graphql/mutations/RemoveUsersFromBill.gql';
import UpdateBillMutation from '../graphql/mutations/UpdateBill.gql';

export default {
    data: () => ({
        editData: null,
        augmentedParticipants: null,
        selectedUserId: 0,
    }),
    props: {
        currentUser: Object,
        group: Object,
        bill: Object,
        show: Boolean,
    },
    computed: {
        nonParticipatingGroupMembers() {
            return this.group.members.nodes.filter(x => !this.augmentedParticipants.some(y => x.id == y.id));
        },
    },
    methods: {
        initializeEditData() {
            if (this.bill == null) return;

            let { name, amount } = this.bill;
            this.editData = { name, amount };

            this.augmentedParticipants = billUtil.augmentedBillParticipants(this.bill);
        },
        removeUserFromBill(user) {
            this.augmentedParticipants = this.augmentedParticipants.filter(x => x.id != user.id);
        },
        addSelectedUserToBill() {
            if (this.selectedUserId == 0) return;
            let user = this.group.members.nodes.find(x => x.id == this.selectedUserId);
            this.augmentedParticipants.push(user);
            this.selectedUserId = 0;
        },
        async saveChanges() {
            let addedUserIds = this.augmentedParticipants.filter(x => !this.bill.participatingUsers.nodes.some(y => x.id == y.id)).map(x => x.id);
            let removedUserIds = this.bill.participatingUsers.nodes.filter(x => !this.augmentedParticipants.some(y => x.id == y.id)).map(x => x.id);
            try {
                let addUsersResult = await this.$apollo.mutate({ mutation: AddUsersToBillMutation, variables: { userIds: addedUserIds, billId: this.bill.id } });
                let removeUsersResult = await this.$apollo.mutate({ mutation: RemoveUsersFromBillMutation, variables: { userIds: removedUserIds, billId: this.bill.id } });

                let updateBillResult = await this.$apollo.mutate({ mutation: UpdateBillMutation, variables: { billId: this.bill.id, patch: this.editData } });

                this.$emit('close');
                this.$emit('updated-bill');
            } catch (err) {
                console.log(err);
            }
        }
    },
    components: {
        FontAwesomeIcon,
        Money,
    },
    watch: {
        bill: {
            immediate: true,
            handler(val) {
                this.initializeEditData()
            },
        },
        show: {
            immediate: true,
            handler(val) {
                this.initializeEditData()
            },
        },
    },
}
</script>
