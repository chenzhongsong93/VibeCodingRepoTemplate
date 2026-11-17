export function submit(store, id, payload) {
  if (!id) throw new Error('id required');
  if (store.has(id)) throw new Error('duplicate');
  const job = { id, payload, state: 'queued' };
  store.set(id, job);
  return job;
}
