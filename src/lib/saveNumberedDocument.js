import mongoose from 'mongoose';

// Rebuild the document on every transaction retry: a successful save in an
// aborted attempt must never turn the next attempt into an update.
export async function saveNumberedDocument(document, allocate, fields, options = {}, afterSave = null) {
  const Model = document.constructor;
  const data = document.toObject({ depopulate: true });
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const candidate = new Model(data);
      const number = await allocate(session);
      for (const field of fields) candidate.set(field, number);
      saved = await candidate.save({ ...options, session });
      if (afterSave) await afterSave(saved, session);
    });
    saved.$session(null);
    return saved;
  } finally {
    await session.endSession();
  }
}
