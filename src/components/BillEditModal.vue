<template>
<div class="modal" v-bind:class="{ 'is-active': show }">
    <div class="modal-background" v-on:click="$emit('close')"></div>
    <div class="modal-card" v-if="editData != null && this.augmentedParticipants != null">
        <header class="modal-card-head">
            <p class="modal-card-title">Edit Bill</p>
        </header>
        <section class="modal-card-body">
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
            <div class="columns is-vcentered" 
              v-for="user in augmentedParticipants"
              v-bind:key="user.id"
              v-bind:class="{ 'has-background-warning': user.isOwner }"
            >
                <div class="column is-4">{{ user.bestIdentifier }}</div>
                <div class="column is-3">
                    <p class="control has-icons-right">
                        <input class="input" type="number" min="0" max="100" step="1"
                          v-model.number="user.percent"
                          v-bind:disabled="currentUser.id != bill.ownerId"
                        >
                        <span class="icon is-right"><font-awesome-icon icon="percent"></font-awesome-icon></span>
                    </p>
                </div>
                <div class="column is-3 has-text-centered">
                    <span class="is-size-4">
                        <pay-status-button
                          class="is-fullwidth"
                          v-bind="user"
                          v-bind:owes="moneyOwedFromPercent(bill.amount, user.percent)"
                          v-bind:label="''"
                          v-bind:editable="canChangePaidStatusForUserOnBill(user, bill)"
                          v-bind:displayLabel="false"
                          v-on:toggle-paid="user.paid = !user.paid"
                        >
                        </pay-status-button>
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
            <button class="button is-success" v-on:click="saveChanges()" v-bind:disabled="!percentsAddUp">Save changes</button>
            <button class="button" v-on:click="$emit('close')">Cancel</button>
            <span class="is-right has-text-danger" v-if="!percentsAddUp">Please ensure that percents add to 100%</span>
        </footer>
    </div>
    <button class="modal-close is-large" v-on:click="$emit('close')"></button>
</div>
</template>

<script>
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faDollarSign, faCheckSquare, faPercent } from '@fortawesome/fontawesome-free-solid';

import { Money } from 'v-money';
import PayStatusButton from './PayStatusButton.vue';

import UtilMixin from '../mixins/Util.js';

import AddUsersToBillMutation from '../graphql/mutations/AddUsersToBill.gql';
import RemoveUsersFromBillMutation from '../graphql/mutations/RemoveUsersFromBill.gql';
import UpdateUserBillStatusMutation from '../graphql/mutations/UpdateUserBillStatus.gql';
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
        percentsAddUp() {
            return this.augmentedParticipants.reduce((total, cur) => total + cur.percent, 0) == 100;
        }
    },
    methods: {
        initializeEditData() {
            if (this.bill == null) return;

            this.editData = pick(this.bill, 'name', 'amount');
            this.augmentedParticipants = this.augmentedBillParticipants(this.bill);
        },
        removeUserFromBill(user) {
            this.augmentedParticipants = this.augmentedParticipants.filter(x => x.id != user.id);
        },
        addSelectedUserToBill() {
            if (this.selectedUserId == 0) return;
            let user = this.group.members.nodes.find(x => x.id == this.selectedUserId);
            let augmented = { ...user, paid: false, percent: 0 };
            this.augmentedParticipants = [...this.augmentedParticipants, augmented];
            console.log(this.augmentedParticipants);
            this.selectedUserId = 0;
        },
        async saveChanges() {
            console.log(this.augmentedParticipants);
            let addedUserIds = this.augmentedParticipants.filter(x => !this.bill.participatingUsers.nodes.some(y => x.id == y.id)).map(x => x.id);
            let removedUserIds = this.bill.participatingUsers.nodes.filter(x => !this.augmentedParticipants.some(y => x.id == y.id)).map(x => x.id);
            try {
                let billInfo = { billId: this.bill.id };

                let addUsersResult = await this.$apollo.mutate({ mutation: AddUsersToBillMutation, variables: { userIds: addedUserIds, ...billInfo } });
                let removeUsersResult = await this.$apollo.mutate({ mutation: RemoveUsersFromBillMutation, variables: { userIds: removedUserIds, ...billInfo } });

                let updateBillResult = await this.$apollo.mutate({ mutation: UpdateBillMutation, variables: { ...billInfo, patch: this.editData } });

                let statusUpdates = [];
                for (let u of this.augmentedParticipants) {
                    let orig = this.bill.participatingUsers.nodes.find(x => x.id == u.id);

                    let origStatus = orig != null ? orig.userBillStatusByBillId : {};
                    let patch = ['paid', 'percent'].reduce((obj, prop) => {
                        console.log(prop, u[prop], origStatus[prop]);
                        if (u[prop] != origStatus[prop]) return { ...obj, [prop]: u[prop] };
                        return obj;
                    }, {});
                    console.log(u.id, patch);
                    statusUpdates.push(this.$apollo.mutate({ mutation: UpdateUserBillStatusMutation, variables: { userId: u.id, ...billInfo, patch } }));
                }

                let statusUpdateResults = await Promise.all(statusUpdates);

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
        PayStatusButton,
    },
    mixins: [UtilMixin],
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
