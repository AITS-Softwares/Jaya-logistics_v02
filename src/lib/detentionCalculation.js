const INDIA_TZ = 'Asia/Kolkata';

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function indiaDate(value) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addCalendarDays(date, days) {
  const result = new Date(`${date}T00:00:00+05:30`);
  result.setUTCDate(result.getUTCDate() + days);
  return indiaDate(result);
}

function timestamp(date, time = '00:00') {
  if (!date || !time) return null;
  const parsed = new Date(`${indiaDate(date)}T${time.length === 5 ? `${time}:00` : time}+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calendarDifference(start, end) {
  const a = new Date(`${indiaDate(start)}T00:00:00+05:30`);
  const b = new Date(`${indiaDate(end)}T00:00:00+05:30`);
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** Calculates a saved, auditable detention result from an active master rule. */
export function calculateDetention({ inDate, inTime, outDate, outTime, localStatus, rule }) {
  const arrival = timestamp(inDate, inTime);
  const departure = timestamp(outDate, outTime);
  if (!arrival || !departure || departure < arrival || !rule) return null;

  let days = 0;
  let chargeStart = null;
  const cutoff = rule.cutoffTime || '16:00';
  const graceDays = Number.isFinite(Number(rule.graceDays)) ? Number(rule.graceDays) : (rule.ruleType === 'OUTSTATION_NEXT_CALENDAR_DAY' ? 2 : 1);

  if (rule.ruleType === 'LOCAL_CALENDAR') {
    days = calendarDifference(arrival, departure);
    chargeStart = `${addCalendarDays(indiaDate(arrival), 1)} 00:00`;
  } else if (rule.ruleType === 'OUTSTATION_NEXT_DAY_CUTOFF') {
    chargeStart = new Date(`${addCalendarDays(indiaDate(arrival), graceDays)}T${cutoff}:00+05:30`);
    if (departure > chargeStart) {
      const hours = (departure - chargeStart) / 3600000;
      days = rule.additionalDayMethod === 'CALENDAR_DAY'
        ? Math.max(1, calendarDifference(chargeStart, departure))
        : Math.ceil(hours / 24);
    }
  } else if (rule.ruleType === 'OUTSTATION_NEXT_CALENDAR_DAY') {
    chargeStart = new Date(`${addCalendarDays(indiaDate(arrival), graceDays)}T00:00:00+05:30`);
    if (departure > chargeStart) {
      const hours = (departure - chargeStart) / 3600000;
      days = rule.additionalDayMethod === 'CALENDAR_DAY'
        ? Math.max(1, calendarDifference(chargeStart, departure))
        : Math.ceil(hours / 24);
    }
  }

  const ratePerDay = number(rule.ratePerDay);
  return {
    detentionDays: days,
    detentionAmount: days * ratePerDay,
    detentionCalculation: {
      ruleId: rule._id?.toString?.() || '',
      ruleName: rule.name,
      ruleType: rule.ruleType,
      movementType: localStatus === 'local' ? 'LOCAL' : 'OUTSTATION',
      cutoffTime: cutoff,
      graceDays,
      additionalDayMethod: rule.additionalDayMethod || 'PARTIAL_24_HOURS',
      ratePerDay,
      calculatedAt: new Date(),
      chargeStart: chargeStart instanceof Date ? chargeStart : undefined,
      explanation: `${rule.name}: ${days} detention day${days === 1 ? '' : 's'} calculated.`
    }
  };
}

export function selectDetentionRule(rules, localStatus, arrivalTime) {
  const movementType = localStatus === 'local' ? 'LOCAL' : 'OUTSTATION';
  const matching = rules.filter((rule) => rule.active && rule.movementType === movementType);
  if (movementType === 'LOCAL') return matching.find((rule) => rule.ruleType === 'LOCAL_CALENDAR');
  const cutoff = matching.find((rule) => rule.ruleType === 'OUTSTATION_NEXT_DAY_CUTOFF')?.cutoffTime || '16:00';
  // Exactly the cutoff is intentionally treated as after the cutoff.
  return (arrivalTime || '00:00') < cutoff
    ? matching.find((rule) => rule.ruleType === 'OUTSTATION_NEXT_DAY_CUTOFF')
    : matching.find((rule) => rule.ruleType === 'OUTSTATION_NEXT_CALENDAR_DAY');
}
