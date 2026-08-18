/**
 * Multi-currency Exchange Rates (Base: USD)
 */
export const EXCHANGE_RATES = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.28,
  INR: 0.012
};

/**
 * Converts any amount from one currency to another
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1.0;
  const toRate = EXCHANGE_RATES[toCurrency] || 1.0;
  // Convert to USD first, then to target currency
  const inUSD = parseFloat(amount) * fromRate;
  return inUSD / toRate;
}

/**
 * Greedy Algorithm to simplify group debts to the minimum number of transactions
 * @param {Array} expenses - Array of expense objects: { amount, currency, paidBy, splitWith }
 * @param {Array} members - Array of member names
 * @param {string} baseCurrency - Group's base currency (e.g. 'USD', 'EUR', 'INR', 'GBP')
 * @returns {Array} List of simplified transactions: [{ from, to, amount, currency }]
 */
export function simplifyDebts(expenses = [], members = [], baseCurrency = 'USD') {
  if (!members || members.length < 2 || !expenses || expenses.length === 0) {
    return [];
  }

  // Net balance for each member in base currency (positive = owed money, negative = owes money)
  const netBalances = {};
  members.forEach(m => {
    netBalances[m] = 0;
  });

  expenses.forEach(exp => {
    const amountInBase = convertCurrency(exp.amount, exp.currency || baseCurrency, baseCurrency);
    const splitMembers = exp.splitWith && exp.splitWith.length > 0 ? exp.splitWith : members;
    const splitAmount = amountInBase / splitMembers.length;

    // The person who paid gets positive credit
    if (netBalances[exp.paidBy] !== undefined) {
      netBalances[exp.paidBy] += amountInBase;
    } else {
      netBalances[exp.paidBy] = amountInBase;
    }

    // Everyone who shares the expense owes their split share
    splitMembers.forEach(member => {
      if (netBalances[member] !== undefined) {
        netBalances[member] -= splitAmount;
      } else {
        netBalances[member] = -splitAmount;
      }
    });
  });

  // Separate debtors and creditors
  // Debtors: list of { name, amount } where amount > 0
  const debtors = [];
  // Creditors: list of { name, amount } where amount > 0
  const creditors = [];

  Object.entries(netBalances).forEach(([name, balance]) => {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ name, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ name, amount: rounded });
    }
  });

  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmount.toFixed(2),
        currency: baseCurrency
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return transactions;
}
