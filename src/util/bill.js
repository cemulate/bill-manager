import money from 'money-math';

function augmentedNonOwnerBillParticipants(bill) {
    // Add 'paid' to the bill's users, remove owner
    return bill.participatingUsers.nodes.map(u => ({
        ...u,
        paid: bill.paidUsers.nodes.some(x => x.id == u.id),
        owes: money.div(bill.amount, money.floatToAmount(bill.participatingUsers.nodes.length)),
    }))
    .filter(x => x.id != bill.ownerId);
}

function billOwner(bill) {
    return bill.participatingUsers.nodes.find(x => x.id == bill.ownerId);
}

export default { augmentedNonOwnerBillParticipants, billOwner };