export function loadingPhotoCount(uploads, prefix) {
  return Object.entries(uploads?.toObject?.() || uploads || {}).filter(([key, value]) =>
    new RegExp(`^${prefix}\\d+$`).test(key) && typeof value === 'string' && value.trim() && value !== 'Not Set').length;
}
export function loadingPhotoError(record, part, optional = false) {
  if (optional) return null;
  const sections = part === 1 ? [['vbp', 3], ['vft', 3]] : part === 2 ? [['vl', 5], ['vot', 3]] : [['vbp', 3], ['vft', 3], ['vl', 5], ['vot', 3]];
  for (const [prefix, minimum] of sections) {
    const count = loadingPhotoCount(record[`${prefix}Uploads`], prefix);
    if (count < minimum) return `Upload at least ${minimum} ${prefix.toUpperCase()} photos before submitting Part ${part || '1 and 2'}. Currently ${count}/${minimum}.`;
  }
  return null;
}

export function loadingSubmissionError(record, part, photosOptional = false) {
  const hasSlip = files => Array.isArray(files) && files.some(path =>
    typeof path === 'string' && path.trim() && path.trim() !== 'Not Set');
  if (part !== 2 && !hasSlip(record.vehicleSlips)) {
    return 'Upload an Empty Vehicle Slip before submitting Part 1.';
  }
  return loadingPhotoError(record, part, photosOptional);
}
