<template>
<div class="modal" v-bind:class="{ 'is-active': show }">
    <div class="modal-background" v-on:click="$emit('close')"></div>
    <div class="modal-card">
        <header class="modal-card-head">
            <p class="modal-card-title">Edit Bill</p>
        </header>
        <section class="modal-card-body" v-if="editBill != null">
            <form class="form">
                <div class="field">
                    <label class="label">Name</label>
                    <div class="control">
                        <input type="text" class="input" v-model="editBill.name" maxlength="80">
                    </div>
                </div>
                <div class="field">
                    <label class="label">Amount</label>
                    <p class="control has-icons-left">
                        <span class="icon is-left"><font-awesome-icon icon="dollar-sign"></font-awesome-icon></span>
                        <input type="number" class="input" v-model="editBill.amount" pattern="\-?\d+\.\d\d">
                    </p>
                </div>
            </form>
            <div class="is-size-4">Bill Members</div>
            <hr>
            <div class="columns is-vcentered">
                <div class="column is-8">{{ billOwner.bestIdentifier }}</div>
                <div class="column is-2 has-text-centered is-size-3 has-text-grey-lighter"><font-awesome-icon icon="check-square"></font-awesome-icon></div>
            </div>
            <div class="columns is-vcentered" v-for="user in nonOwnerParticipantsWithPaidStatus" v-bind:key="user.id">
                <div class="column is-8">{{ user.bestIdentifier }}</div>
                <div class="column is-2 has-text-centered is-size-4 has-text-success" v-if="user.paid"><font-awesome-icon icon="check-square"></font-awesome-icon></div>
                <div class="column is-2 has-text-centered" v-else>
                    <span class="is-text-weight-bold">Owes <strong>${{ user.owes }}</strong></span>
                </div>
                <div class="column is-narrow is-right" v-if="currentUser.id == editBill.ownerId">
                    <a class="button is-danger" v-on:click="removeUserFromBill(user)">Remove</a>
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
                                    <option v-for="user in nonParticipatingGroupMembers" v-bind:value="user.id">{{ user.bestIdentifier }}</option>
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
import EventBus from '../util/event-bus.js';

import cloneDeep from 'lodash/cloneDeep';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faDollarSign, faCheckSquare } from '@fortawesome/fontawesome-free-solid';

import billUtil from '../util/bill.js';

import AddUserToBillMutation from '../graphql/mutations/AddUserToBill.gql';
import RemoveUserFromBillMutation from '../graphql/mutations/RemoveUserFromBill.gql';
import UpdateBillMutation from '../graphql/mutations/UpdateBill.gql';

export default {
    data: () => ({
        editBill: null,
        selectedUserId: 0,
    }),
    props: {
        currentUser: Object,
        group: Object,
        bill: Object,
        show: Boolean,
    },
    computed: {
        // TODO: Find a way to not duplicate these with BillDetail.vue
        nonOwnerParticipantsWithPaidStatus() {
            return billUtil.augmentedNonOwnerBillParticipants(this.editBill);
        },
        billOwner() {
            return billUtil.billOwner(this.editBill);
        },
        nonParticipatingGroupMembers() {
            return this.group.members.nodes.filter(x => !this.editBill.participatingUsers.nodes.some(y => x.id == y.id));
        },
    },
    methods: {
        initializeEditBill() {
            console.log(this.bill);
            this.editBill = cloneDeep(this.bill);
        },
        removeUserFromBill(user) {
            this.editBill.participatingUsers.nodes = this.editBill.participatingUsers.nodes.filter(x => x.id != user.id);
        },
        addSelectedUserToBill() {
            if (this.selectedUserId == 0) return;
            let user = this.group.members.nodes.find(x => x.id == this.selectedUserId);
            console.log(user);
            this.editBill.participatingUsers.nodes.push(user);
            this.selectedUserId = 0;
        },
        async saveChanges() {
            let addedUsers = this.editBill.participatingUsers.nodes.filter(x => !this.bill.participatingUsers.nodes.some(y => x.id == y.id));
            let removedUsers = this.bill.participatingUsers.nodes.filter(x => !this.editBill.participatingUsers.nodes.some(y => x.id == y.id));
            try {
                let addUserResults = await Promise.all(addedUsers.map(u => {
                    return this.$apollo.mutate({ mutation: AddUserToBillMutation, variables: { userId: u.id, billId: this.bill.id } });
                }));
                let removeUserResults = await Promise.all(removedUsers.map(u => {
                    return this.$apollo.mutate({ mutation: RemoveUserFromBillMutation, variables: { userId: u.id, billId: this.bill.id } });
                }));
                let { name, amount } = this.editBill;
                let patch = { name, amount };
                let billResults = await this.$apollo.mutate({ mutation: UpdateBillMutation, variables: { billId: this.bill.id, patch } });

                this.$emit('close');
                this.$emit('updated-bill');
            } catch (err) {
                console.log(err);
            }
        }
    },
    components: {
        FontAwesomeIcon,
    },
    watch: {
        bill: {
            immediate: true,
            handler(val) {
                this.initializeEditBill()
            },
        },
        show: {
            immediate: true,
            handler(val) {
                this.initializeEditBill()
            },
        },
    },
}
</script>
