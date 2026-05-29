function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function calculateCurrentCycle(input = {}) {
  const now = input.now ? new Date(input.now) : new Date();
  const type = input.type || 'natural_month';

  if (type === 'fixed_days') {
    const fixedDays = Number(input.fixedDays || 30);
    const start = input.startDate ? new Date(input.startDate) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return {
      type,
      startDate: toDateOnly(start),
      endDate: toDateOnly(addDays(start, fixedDays - 1)),
      startDay: null,
      fixedDays
    };
  }

  if (type === 'monthly_start') {
    const startDay = Math.min(Math.max(Number(input.startDay || 1), 1), 28);
    let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), startDay));
    if (now.getUTCDate() < startDay) {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, startDay));
    }
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, startDay));
    return {
      type,
      startDate: toDateOnly(start),
      endDate: toDateOnly(addDays(next, -1)),
      startDay,
      fixedDays: null
    };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    type: 'natural_month',
    startDate: toDateOnly(start),
    endDate: toDateOnly(addDays(next, -1)),
    startDay: 1,
    fixedDays: null
  };
}

export function daysRemaining(endDate) {
  const today = new Date();
  const end = new Date(`${endDate}T23:59:59.999Z`);
  const diff = Math.ceil((end - today) / 86400000);
  return Math.max(diff, 0);
}
