<template>
<div id="root">

    <div class="tabs">
        <ul>
            <li v-bind:class="{ 'is-active': selectedTab == 0 }" v-on:click="selectedTab = 0"><a>Members</a></li>
            <li v-bind:class="{ 'is-active': selectedTab == 1 }" v-on:click="selectedTab = 1"><a>Bills</a></li>
        </ul>
    </div>

    <div v-if="group != null && selectedTab == 0">
        <div class="columns">
            <div class="column">
                <strong>{{ group.owner.bestIdentifier }}</strong>
            </div>
        </div>
        <div class="columns" v-for="member in nonOwnerMembers" v-bind:key="member.id">
            <div class="column">
                {{ member.bestIdentifier }}
            </div>
        </div>
    </div>

    <div v-if="group != null && selectedTab == 1">
        <nav class="level" v-for="bill in bills" v-bind:key="bill.id">
            <div class="level-left">
                <div class="level-item is-size-4">
                    {{ bill.name }}
                </div>
            </div>
            <div class="level-right">
                <div class="level-item is-size-4">
                    ${{ bill.amount }}
                </div>
            </div>
        </nav>
    </div>

</div>
</template>

<script>
import GroupDetailQuery from '../graphql/queries/GroupDetail.gql';

export default {
    data: () => ({
        group: null,
        selectedTab: 0,
    }),
    props: {
        groupId: Number,
    },
    computed: {
        nonOwnerMembers() {
            return this.group.members.nodes.filter(x => x.id != this.group.owner.id);
        },
        bills() {
            return this.group.billsByGroupId.nodes;
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
}
</script>
