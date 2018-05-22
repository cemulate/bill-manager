import money from 'money-math';

function augmentedBillParticipants(bill) {
    // Add 'paid' to the bill's users, remove owner
    return bill.participatingUsers.nodes.map(u => {
        let status = u.userBillStatusByBillId || { percent: 0, paid: false };
        return {
            originalUser: u,
            ...u,
            ...status,
            owes: money.percent(bill.amount, money.floatToAmount(status.percent)),
            isOwner: u.id == bill.ownerId,
        };
    })
    .sort((a, b) => a.isOwner ? -1 : 1);
}

function billOwner(bill) {
    let owner = bill.participatingUsers.nodes.find(x => x.id == bill.ownerId);
    return {
        ...owner,
        paid: true,
        percent: owner.userBillStatusByBillId.percent,
        owes: money.percent(bill.amount, money.floatToAmount(owner.userBillStatusByBillId.percent)),
    }
}

export default { augmentedBillParticipants };