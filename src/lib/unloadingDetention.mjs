export function normaliseDetentionRuleType(input) {
  const detentionType = input.detentionType || 'LOADING';
  if (!['LOADING', 'UNLOADING'].includes(detentionType)) throw new Error('Select Loading or Unloading detention.');
  const cutoffTime = input.cutoffTime || '16:00';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)) throw new Error('Enter a valid cutoff time (HH:mm).');
  if (detentionType === 'UNLOADING') {
    const ruleType = input.ruleType || 'UNLOADING_BEFORE_CUTOFF';
    if (!['UNLOADING_BEFORE_CUTOFF', 'UNLOADING_AT_OR_AFTER_CUTOFF', 'UNLOADING_CUTOFF'].includes(ruleType)) {
      throw new Error('Select a valid unloading calculation rule.');
    }
    return { ...input, detentionType, movementType: 'ALL', ruleType,
      cutoffTime, graceDays: ruleType === 'UNLOADING_BEFORE_CUTOFF' ? 1 : 0,
      additionalDayMethod: 'CALENDAR_DAY' };
  }
  const allowed = input.movementType === 'LOCAL'
    ? ['LOCAL_CALENDAR'] : input.movementType === 'OUTSTATION'
      ? ['OUTSTATION_NEXT_DAY_CUTOFF', 'OUTSTATION_NEXT_CALENDAR_DAY'] : [];
  if (!allowed.includes(input.ruleType)) throw new Error('Select a valid loading movement and calculation rule.');
  return { ...input, detentionType, cutoffTime };
}
