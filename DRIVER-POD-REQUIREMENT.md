# Deferred requirement: driver POD capture and enhancement

Recorded on 12 November 2026. The user requested a refined explanation and saving this requirement for later. Do not implement until asked.

## User requirement

Allow drivers to upload POD receipts through the driver app. Automatically enhance captured/uploaded photos with a document-scanner-style colour filter, similar to the Adobe workflow the user uses. Translate POD content when necessary.

## Proposed workflow (implementation details remain to be confirmed)

1. Driver opens an assigned delivery and selects its LR/drop. Avoid making a trip-level receipt apply automatically to every delivery.
2. Capture a photo or select from the gallery; support multiple receipt pages.
3. Detect page edges, crop/straighten, and offer automatic colour/contrast enhancement with original/enhanced preview. Warn about blur, glare, or missing edges and allow retake/manual correction. Preserve stamps, signatures, handwriting, and receipt content.
4. Driver reviews the pages, adds an optional note, and submits. Save the original alongside the enhanced version with uploader, time, delivery/LR reference, and review history.
5. Support local pending uploads and retry after connection returns. Distinguish pending, uploading, received, needs correction, and accepted states. Mark received only after the server confirms persistence. Avoid duplicate records on retries.
6. Make receipts available to the existing ERP POD workflow against the matching delivery/LR. Submission does not automatically approve a POD, settle a payment, or authorize billing. Confirm how receipt evidence relates to existing delivered/trip-completion actions before implementation.
7. Reviewer can inspect original/enhanced pages, accept evidence or request a clearer replacement. Keep replacement history.

## Text extraction and translation proposal

- Extract text (OCR) from the receipt; detect language and provide translation on request when necessary.
- Show extracted text and a clearly labelled translation alongside the original image. Never replace or alter the original receipt using translated text.
- Preserve invoice/LR numbers, names, quantities, dates, and amounts; highlight uncertain readings for human verification. Never infer an unreadable value as a verified fact.
- OCR/translation failures must not prevent saving the original receipt. Translation is assistance for review, not proof of correctness.
- Suggested field values may be offered later; do not automatically overwrite approved ERP data.

## Suggested phases

1. Receipt capture/gallery upload, enhancement, original retention, multiple pages, offline retry, LR/drop linking, ERP review.
2. OCR, optional translation, uncertainty handling, optional suggested field extraction.

## Decisions still open

- Confirm receipt linkage to LR/drop and whether one receipt can explicitly cover several LRs.
- Confirm accepted translation languages (English was suggested, not mandated).
- Choose on-device/server processing, enhancement/OCR providers, privacy, retention, storage limits, and processing costs during implementation.
- Confirm permissions, reviewer roles, file limits, and interaction with current delivery completion and POD approval controls.

No driver POD functionality has been implemented for this requirement.
