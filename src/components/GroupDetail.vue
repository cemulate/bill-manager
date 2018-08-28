<template>
<div id="root">

    <div class="tabs">
        <ul>
            <li tabindex="0" v-bind:class="{ 'is-active': selectedTab == 0 }" v-on:click="selectedTab = 0" v-on:keyup.enter="selectedTab = 0"><a>Bills</a></li>
            <li tabindex="0" v-bind:class="{ 'is-active': selectedTab == 1 }" v-on:click="selectedTab = 1" v-on:keyup.enter="selectedTab = 1"><a>Info</a></li>
            <li tabindex="0" v-bind:class="{ 'is-active': selectedTab == 2 }" v-on:click="selectedTab = 2" v-on:keyup.enter="selectedTab = 2"><a>Reconcile</a></li>
        </ul>
    </div>

    <div v-if="group != null && selectedTab == 0">
        <span v-if="billsByMonth.length == 0">
            <button class="button is-link" v-on:click="createNewBill" v-on:keyup.enter="createNewBill">
                <font-awesome-icon icon="plus"></font-awesome-icon>&nbsp; New Bill
            </button>
        </span>
        <section v-for="{ month, bills } in billsByMonth" v-bind:key="month">
            <div class="level">
                <div class="level-left">
                    <div class="level-item"><span class="is-size-4">{{ formatMonthHeading(month) }}</span></div>
                </div>
                <div class="level-right">
                    <div class="level-item">
                        <button class="button is-link" v-on:click="createNewBill" v-on:keyup.enter="createNewBill">
                            <font-awesome-icon icon="plus"></font-awesome-icon>&nbsp; New Bill
                        </button>
                    </div>
                </div>
            </div>
            <hr>
            <bill-detail
              v-bind:current-user="currentUser"
              v-bind:group="group"
              v-for="bill in bills"
              v-bind:bill-id="bill.id"
              v-bind:key="bill.id"
              v-bind:open-modal="recentlyCreatedBillId == bill.id"
              v-on:did-open-modal="recentlyCreatedBillId = null"
              v-on:deleted="$apollo.queries.group.refetch()"
            >
            </bill-detail>
        </section>
    </div>

    <div v-if="group != null && selectedTab == 1">
        <div class="box">
            <span class="is-size-5">Members</span>
            <hr>
            <div class="tags">
                <span class="tag is-large is-warning">{{ group.userByOwnerId.username }}</span>
                <span class="tag is-large" v-for="member in nonOwnerMembers" v-bind:key="member.id">{{ member.username }}</span>
            </div>
        </div>
        <group-invite v-bind:groupId="group.id"></group-invite>
        <hr>
        <button class="button is-danger" v-if="group.ownerId == currentUser.id" v-on:click="showDeleteGroupModal = true">Delete this group</button>
        <delete-confirmation-modal
          v-bind:target="group.name"
          v-bind:extra-warning="'Doing so will delete all bills in this group'"
          v-bind:show="showDeleteGroupModal"
          v-on:close="showDeleteGroupModal = false"
          v-on:delete="deleteGroup"
        >
        </delete-confirmation-modal>
    </div>

    <div v-if="group != null && selectedTab == 2">
        <reconcile-view
          v-bind:current-user="currentUser"
          v-bind:groupId="group.id"
          v-bind:members="group.members.nodes"
        >
        </reconcile-view>
    </div>

</div>
</template>

<script>
import BillDetail from './BillDetail.vue';
import GroupInvite from './GroupInvite.vue';
import ReconcileView from './ReconcileView.vue';
import DeleteConfirmationModal from './DeleteConfirmationModal.vue';

import GroupDetailQuery from '../graphql/queries/GroupDetail.gql';
import CreateNewBillMutation from '../graphql/mutations/CreateNewBill.gql';
import DeleteGroupMutation from '../graphql/mutations/DeleteGroup.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faPlus } from '@fortawesome/fontawesome-free-solid';

import groupBy from 'lodash/groupBy';
import { parse, format, startOfMonth } from 'date-fns';

export default {
    data: () => ({
        group: null,
        selectedTab: 0,
        recentlyCreatedBillId: null,
        showDeleteGroupModal: false,
    }),
    props: {
        currentUser: Object,
        groupId: Number,
    },
    computed: {
        nonOwnerMembers() {
            return this.group.members.nodes.filter(x => x.id != this.group.userByOwnerId.id);
        },
        billsByMonth() {
            let grouped = groupBy(this.group.billsByGroupId.nodes, x => startOfMonth(parse(x.createdAt)));
            return Object.keys(grouped)
            .sort((a, b) => a - b)
            .map(x => ({ month: x, bills: grouped[x] }));
        },
    },
    methods: {
        formatMonthHeading(date) {
            return format(parse(date), 'MMMM YYYY');
        },
        async createNewBill() {
            try {
                let result = await this.$apollo.mutate({ mutation: CreateNewBillMutation, variables: { groupId: this.groupId } });
                let newBillId = result.data.createBill.bill.id;
                await this.$apollo.queries.group.refetch();
                // This causes the modal to open on the BillDetail with this id
                this.recentlyCreatedBillId = newBillId;
            } catch (err) {
                console.log(err);
            }
        },
        async deleteGroup() {
            try {
                let result = await this.$apollo.mutate({ mutation: DeleteGroupMutation, variables: { groupId: this.groupId } });
                this.$emit('deleted');
            } catch (err) {

            }
        }
    },
    apollo: {
        group: {
            query: GroupDetailQuery,
            variables() {
                return { groupId: this.groupId };
            },
            update: data => data.groupById,
        }
    },
    components: {
        FontAwesomeIcon,
        BillDetail,
        GroupInvite,
        ReconcileView,
        DeleteConfirmationModal,
    },
}
</script>
