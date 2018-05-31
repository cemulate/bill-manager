<template>
<div id="root">

<template v-for="(balanceData, index) in balances">
<div class="level" v-bind:key="balanceData.targetUser.id">
    <div class="level-left">
        <div class="level-item">
            <span class="is-size-5" v-if="balanceData.owes">
                {{ balanceData.owes ? 'You owe ' : '' }}
                <strong>{{ balanceData.targetUser.username }}</strong>
                {{ balanceData.owes ? '' : ' owes you' }}
                a total of <strong>${{ balanceData.balance }}</strong>
            </span>
            <span class="is-size-5" v-else>
                <strong>{{ balanceData.targetUser.username }}</strong> owes you a total of <strong>${{ balanceData.balance }}</strong>
            </span>
        </div>
    </div>
    <div class="level-right">
        <div class="level-item">
            <button class="button" v-bind:class="{ 'is-link': balanceData.owes }" v-on:click="showingModalFor = balanceData.targetUser.id">
                {{ balanceData.owes ? 'Pay now' : 'Send a reminder'}}
            </button>
            <reconcile-modal
              v-bind:target-username="balanceData.targetUser.username"
              v-bind:show="showingModalFor == balanceData.targetUser.id"
              v-bind:affected-bills="getAffectedBillsFromBalanceData(balanceData)"
              v-on:close="showingModalFor = null"
              v-on:reconcile="reconcile(balanceData)"
            >
            </reconcile-modal>
        </div>
    </div>
</div>
<hr v-if="index < members.length - 1">
</template>

</div>
</template>

<script>
import money from 'money-math';

import AllUserBillStatusesQuery from '../graphql/queries/AllUserBillStatuses.gql';
import UpdateUserBillStatusMutation from '../graphql/mutations/UpdateUserBillStatus.gql';

import ReconcileModal from './ReconcileModal.vue';

import UtilMixin from '../mixins/Util.js';

export default {
    data: () => ({
        statuses: null,
        showingModalFor: null,
    }),
    props: {
        currentUser: Object,
        groupId: Number,
        members: Array,
    },
    computed: {
        balances() {
            if (this.statuses == null) return new Map();
            let results = [];
            for (let targetUser of this.members) {
                if (targetUser.id == this.currentUser.id) continue;

                let oweHim = this.statuses.filter(x =>
                    x.billByBillId.ownerId == targetUser.id &&
                    x.userId == this.currentUser.id &&
                    !x.paid
                );
                let owesMe = this.statuses.filter(x =>
                    x.billByBillId.ownerId == this.currentUser.id &&
                    x.userId == targetUser.id &&
                    !x.paid
                );
                let moneyAdditionReducer = (total, cur) => money.add(total, this.moneyOwedFromPercent(cur.billByBillId.amount, cur.percent));
                let positive = oweHim.reduce(moneyAdditionReducer, '0.00');
                let negative = owesMe.reduce(moneyAdditionReducer, '0.00');
                let balance = money.subtract(positive, negative);
                if (!money.isZero(balance)) {
                    console.log(balance, targetUser);
                    let abs = money.isNegative(balance) ? money.mul(balance, '-1.00') : balance;
                    results.push({
                        targetUser,
                        balance: abs,
                        owes: !money.isNegative(balance),
                        affectedStatuses: [...oweHim, ...owesMe],
                    });
                }
            }
            return results;
        },
    },
    methods: {
        getAffectedBillsFromBalanceData(data) {
            return data.affectedStatuses.map(x => x.billByBillId);
        },
        async reconcile(data) {
            try {
                let results = await Promise.all(data.affectedStatuses.map(status => {
                    let { userId, billId } = status;
                    let patch = { paid: true };
                    return this.$apollo.mutate({ mutation: UpdateUserBillStatusMutation, variables: { userId, billId, patch } });
                }));
                this.$apollo.queries.statuses.refetch();
            } catch (err) {

            } finally {
                this.showingModalFor = null;
            }
        },
    },
    created() {
        this.$apollo.queries.statuses.refetch();
    },
    apollo: {
        statuses: {
            query: AllUserBillStatusesQuery,
            variables() {
                return { groupId: this.groupId };
            },
            update: data => data.groupById.allUserBillStatuses.nodes,
        }
    },
    components: {
        ReconcileModal,
    },
    mixins: [UtilMixin],
};
</script>
