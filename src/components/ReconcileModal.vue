<template>
<div class="modal" v-bind:class="{ 'is-active': show }">
    <div class="modal-background" v-on:click="$emit('close')"></div>
    <div class="modal-card">
        <header class="modal-card-head">
            <p class="modal-card-title">Reconcile with <strong>{{ targetUsername }}</strong>?</p>
        </header>
        <section class="modal-card-body">
            <div class="content">
                This will settle outstanding balances from you and <strong>{{ targetUsername }}</strong> on the following bills:
                <ul>
                    <li v-for="bill in affectedBills">
                        {{ bill.name }} ({{ dateFormat(bill.createdAt, 'MMMM Mo') }})
                    </li>
                </ul>
            </div>
        </section>
        <footer class="modal-card-foot">
            <button class="button is-success" v-on:click="$emit('reconcile')">Reconcile</button>
            <button class="button" v-on:click="$emit('close')">Cancel</button>
        </footer>
    </div>
    <button class="modal-close is-large" v-on:click="$emit('close')"></button>
</div>
</template>

<script>
import UtilMixin from '../mixins/Util.js';

export default {
    data: () => ({

    }),
    props: {
        show: Boolean,
        targetUsername: String,
        affectedBills: Array,
    },
    computed: {
        orderedAffectedBills() {
            return this.affectedBills.sort((a, b) => a.createdAt - b.createdAt);
        },
    },
    mixins: [UtilMixin],
}
</script>
