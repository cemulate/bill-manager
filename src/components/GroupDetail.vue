<template>
<div id="root">

    <div class="tabs">
        <ul>
            <li v-bind:class="{ 'is-active': selectedTab == 0 }" v-on:click="selectedTab = 0"><a>Bills</a></li>
            <li v-bind:class="{ 'is-active': selectedTab == 1 }" v-on:click="selectedTab = 1"><a>Members</a></li>
        </ul>
    </div>

    <div v-if="group != null && selectedTab == 0">
        <nav class="level">
            <div class="level-left">
                <div class="level-item">
                    <a class="button is-link" v-on:click="createNewBill"><font-awesome-icon icon="plus"></font-awesome-icon>&nbsp; New Bill</a>
                </div>
            </div>
            <div class="level-right">
                <div class="level-item">
                    
                </div>
            </div>
        </nav>
        <section v-for="{ month, bills } in billsByMonth" v-bind:key="month">
            <span class="is-size-4">{{ formatMonthHeading(month) }}</span>
            <hr>
            <bill-detail 
              v-bind:current-user="currentUser"
              v-bind:group="group"
              v-for="bill in bills" 
              v-bind:bill-id="bill.id" 
              v-bind:key="bill.id"
              v-bind:open-modal="recentlyCreatedBillId == bill.id"
              v-on:did-open-modal="recentlyCreatedBillId = null"
            >
            </bill-detail>
        </section>
    </div>

    <div v-if="group != null && selectedTab == 1">
        <div class="columns">
            <div class="column">
                <strong>{{ group.userByOwnerId.bestIdentifier }}</strong>
            </div>
        </div>
        <div class="columns" v-for="member in nonOwnerMembers" v-bind:key="member.id">
            <div class="column">
                {{ member.bestIdentifier }}
            </div>
        </div>
    </div>

</div>
</template>

<script>
import BillDetail from './BillDetail.vue';

import GroupDetailQuery from '../graphql/queries/GroupDetail.gql';
import CreateNewBillMutation from '../graphql/mutations/CreateNewBill.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faPlus } from '@fortawesome/fontawesome-free-solid';

import groupBy from 'lodash/groupBy';
import { parse, format, startOfMonth } from 'date-fns';

export default {
    data: () => ({
        group: null,
        selectedTab: 0,
        recentlyCreatedBillId: null,
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
    },
}
</script>
