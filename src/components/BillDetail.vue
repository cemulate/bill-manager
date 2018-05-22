<template>
<div id="root">

<div class="columns" v-if="bill != null">
    <div class="column is-4">
        <div class="is-size-4">
            <a v-on:click="showEditModal = true">
                <span class="is-size-5" v-if="bill.ownerId == currentUser.id"><font-awesome-icon icon="user-cog"></font-awesome-icon></span>
                {{ bill.name }}
            </a>
            &nbsp;
            <strong>${{ bill.amount }}</strong>
        </div>
        <div>Created {{ dateFormat(bill.createdAt, 'MM/DD/YYYY') }}</div>
    </div>
    <div class="column is-8">
        <div class="buttons">
            <span class="button"
              v-for="user in augmentedParticipants"
              v-bind:key="user.id"
              v-bind:class="{ 'is-success': user.paid, 'is-warning': user.isOwner }"
              v-bind:disabled="user.id != currentUser.id || user.isOwner"
            >
                <span>{{ user.firstName || user.bestIdentifier }}</span>
                &nbsp;
                <font-awesome-icon v-if="user.paid" icon="check"></font-awesome-icon>
                <span v-if="!user.paid"><strong>${{ user.owes }}</strong></span>
            </span>
        </div>
    </div>
</div>

<bill-edit-modal
  v-bind:group="group"
  v-bind:bill="bill"
  v-bind:current-user="currentUser"
  v-bind:show="showEditModal"
  v-on:close="showEditModal = false"
  v-on:updated-bill="refreshBill()"
>
</bill-edit-modal>

</div>
</template>

<script>
import BillDetailQuery from '../graphql/queries/BillDetail.gql';
import CurrentPersonQuery from '../graphql/queries/CurrentPerson.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faCheck, faUserCog } from '@fortawesome/fontawesome-free-solid';

import BillEditModal from './BillEditModal.vue';

import { format, parse } from 'date-fns';
import billUtil from '../util/bill.js';

export default {
    data: () => ({
        bill: null,
        participatingUsers: null,
        showEditModal: false,
    }),
    props: {
        currentUser: Object,
        group: Object,
        billId: Number,
        openModal: Boolean,
    },
    computed: {
        augmentedParticipants() {
            return billUtil.augmentedBillParticipants(this.bill);
        },
        billOwner() {
            return billUtil.augmentedBillParticipants(this.bill).find(x => x.isOwner);
        },
    },
    methods: {
        dateFormat(date) {
            console.log(date);
            return format(parse(date), 'MM/DD/YYYY');
        },
        refreshBill() {
            this.$apollo.queries.bill.refetch();
        },
    },
    apollo: {
        bill: {
            query: BillDetailQuery,
            variables() {
                return { billId: this.billId };
            },
            update: data => data.billById,
        }
    },
    watch: {
        openModal(val) {
            if (val) this.showEditModal = true;
            this.$emit('did-open-modal');
        },
    },
    components: {
        FontAwesomeIcon,
        BillEditModal,
    },
}
</script>
