
function simplifyDebts(expenses) {
  const balance = {};

  expenses.forEach(({ paidBy, splitBetween, amount }) => {
    if (!splitBetween || splitBetween.length === 0) return;
    const share   = amount / splitBetween.length;
    const payerId = paidBy.toString();

    if (!balance[payerId]) balance[payerId] = 0;
    balance[payerId] += amount;

    splitBetween.forEach(memberId => {
      const id = memberId.toString();
      if (!balance[id]) balance[id] = 0;
      balance[id] -= share;
    });
  });

  const debtors   = Object.entries(balance).filter(([, v]) => v < -0.01).map(([k, v]) => ({ id: k, amount: -v })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balance).filter(([, v]) => v >  0.01).map(([k, v]) => ({ id: k, amount:  v })).sort((a, b) => b.amount - a.amount);

  const payments = [];
  let i = 0, j = 0;
  const d = debtors.map(x => ({ ...x }));
  const c = creditors.map(x => ({ ...x }));

  while (i < d.length && j < c.length) {
    const amt = Math.min(d[i].amount, c[j].amount);
    if (amt > 0.01) payments.push({ from: d[i].id, to: c[j].id, amount: Math.round(amt) });
    d[i].amount -= amt;
    c[j].amount -= amt;
    if (d[i].amount < 0.01) i++;
    if (c[j].amount < 0.01) j++;
  }

  return payments;
}

module.exports = { simplifyDebts };
