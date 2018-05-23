import money from 'money-math';

export default {
    methods: {
        augmentedBillParticipants(bill) {
            // Add 'paid' to the bill's users, remove owner
            return bill.participatingUsers.nodes.map(u => {
                let status = u.userBillStatusByBillId;
                return {
                    originalUser: u,
                    ...u,
                    ...status,
                    owes: money.percent(bill.amount, money.floatToAmount(status.percent)),
                    isOwner: u.id == bill.ownerId,
                };
            })
            .sort((a, b) => a.isOwner ? -1 : 1);
        },

        canChangePaidStatusForUserOnBill(user, bill) {
            if (user.id == bill.ownerId) return false;
            let isCurrent = this.currentUser.id == user.id;
            let isOwner = this.currentUser.id == this.bill.ownerId;
            return (isCurrent && !isOwner) || (!isCurrent && isOwner);
        },

        moneyOwedFromPercent(total, percent) {
            return money.percent(total, money.floatToAmount(percent));
        }
    },
};