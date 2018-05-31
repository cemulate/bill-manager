<template>
<div id="root">

<div class="columns" v-if="bill != null">
    <div class="column is-4">
        <div class="is-size-4">
            <a tabindex="0" v-on:click="showEditModal = true" v-on:keyup.enter="showEditModal = true">
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
            <pay-status-button
              v-for="user in augmentedParticipants"
              v-bind:key="user.id"
              v-bind="user"
              v-bind:label="user.username"
              v-bind:editable="canChangePaidStatusForUserOnBill(user, bill)"
              v-bind:isLoading="currentlyTogglingUserId == user.id"
              v-on:toggle-paid="toggleUserPaid(user)"
            >
            </pay-status-button>
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
import UpdateUserBillStatusMutation from '../graphql/mutations/UpdateUserBillStatus.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faCheck, faUserCog } from '@fortawesome/fontawesome-free-solid';

import PayStatusButton from './PayStatusButton.vue';
import BillEditModal from './BillEditModal.vue';

import UtilMixin from '../mixins/Util.js';

import { format, parse } from 'date-fns';

export default {
    data: () => ({
        bill: null,
        participatingUsers: null,
        showEditModal: false,
        currentlyTogglingUserId: null,
    }),
    props: {
        currentUser: Object,
        group: Object,
        billId: Number,
        openModal: Boolean,
    },
    computed: {
        augmentedParticipants() {
            return this.augmentedBillParticipants(this.bill);
        },
        billOwner() {
            return this.augmentedBillParticipants(this.bill).find(x => x.isOwner);
        },
    },
    methods: {
        refreshBill() {
            this.$apollo.queries.bill.refetch();
        },
        async toggleUserPaid(user) {
            try {
                this.currentlyTogglingUserId = user.id;
                let patch = { paid: !user.paid };
                let result = await this.$apollo.mutate({ mutation: UpdateUserBillStatusMutation, variables: { userId: user.id, billId: this.billId, patch } });
                await this.$apollo.queries.bill.refetch();
            } catch (err) {
                console.log(err);
            } finally {
                this.currentlyTogglingUserId = null;
            }
        },
    },
    created() {
        this.refreshBill();
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
        PayStatusButton,
        BillEditModal,
    },
    mixins: [UtilMixin],
}
</script>
