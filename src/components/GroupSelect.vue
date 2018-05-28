<template>
    <nav class="panel">
        <p class="panel-heading">Groups</p>
        <a class="panel-block"
          tabindex="0"
          v-for="group in groups"
          v-bind:key="group.id"
          v-bind:class="{ 'is-active': isGroupSelected(group) }"
          v-on:click="$emit('select-group', group.id)"
          v-on:keyup.enter="$emit('select-group', group.id)"
        >
            <span class="panel-icon"><font-awesome-icon icon="users"></font-awesome-icon></span>
            <span v-bind:class="{ 'has-text-weight-bold': isGroupSelected(group) }">{{ group.name }}</span>
        </a>
        <div class="panel-block">
            <div class="field has-addons" style="width: 100%"> <!-- Hack? -->
                <div class="control has-icons-left is-expanded">
                    <span class="icon is-left"><font-awesome-icon icon="plus"></font-awesome-icon></span>
                    <input type="text" class="input" placeholder="New group name" maxlength="80" v-model="newGroupName" v-on:keyup.enter="createNewGroup">
                </div>
                <div class="control">
                    <a tabindex="0" class="button is-link" v-on:click="createNewGroup" v-on:keyup.enter="createNewGroup">Create</a>
                </div>
            </div>
        </div>
    </nav>
</template>

<script>
import GroupsQuery from '../graphql/queries/Groups.gql';
import CreateNewGroupMutation from '../graphql/mutations/CreateNewGroup.gql';

import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
import { faUsers, faPlus } from '@fortawesome/fontawesome-free-solid';

export default {
    data: () => ({
        groups: [],
        newGroupName: '',
    }),
    props: {
        selectedGroupId: Number,
    },
    methods: {
        isGroupSelected(group) {
            return this.selectedGroupId != null && group.id == this.selectedGroupId;
        },
        async createNewGroup() {
            if (this.newGroupName.length == 0) return;
            try {
                let result = await this.$apollo.mutate({ mutation: CreateNewGroupMutation, variables: { name: this.newGroupName } });
                let newGroupId = result.data.createGroup.group.id;
                await this.$apollo.queries.groups.refetch();
                this.$emit('select-group', newGroupId);
            } catch (err) {
                console.log(err);
            }
        },
    },
    apollo: {
        groups: {
            query: GroupsQuery,
            update: data => data.currentPerson.participatingGroups.nodes,
            error(err) {
                this.groups = [];
            },
        },
    },
    watch: {
        selectedGroupId(val) {
            if (!this.groups.some(x => x.id == val)) {
                this.$apollo.queries.groups.refetch();
            }
        },
    },
    components: {
        FontAwesomeIcon,
    },
}
</script>
