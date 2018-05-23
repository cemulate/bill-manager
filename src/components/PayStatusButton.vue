<template>
    <span class="button"
      v-bind:class="{ 'is-success': paid && !isOwner, 'is-warning': isOwner, 'is-loading': isLoading }"
      v-bind:disabled="!editable"
      v-on:click="$emit('toggle-paid')"
    >
        <span v-if="displayLabel">{{ label }}</span>
        <strong v-if="!displayLabel">${{ owes }}</strong>

        <span v-if="shouldHaveSpace">&nbsp;</span>

        <font-awesome-icon v-if="paid" icon="check"></font-awesome-icon>
        <span v-if="displayLabel && !paid"><strong>${{ owes }}</strong></span>
    </span>
</template>

<script>
import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faCheck } from '@fortawesome/fontawesome-free-solid';

export default {
    props: {
        paid: Boolean,
        owes: String,
        isOwner: Boolean,
        label: String,
        editable: Boolean,
        isLoading: Boolean,
        displayLabel: {
            type: Boolean,
            default: true,
        }
    },
    computed: {
        shouldHaveSpace() {
            if (this.displayLabel) {
                return this.label.length > 0;
            } else {
                return this.paid;
            }
        },
    },
    components: {
        FontAwesomeIcon,
    },
};
</script>
