export async function execute(store, id, operation) {
  const job = store.get(id);
  if (!job || job.state !== 'queued') throw new Error('not runnable');
  job.state = 'running';
  try {
    job.result = await operation(job.payload);
    job.state = 'done';
    return job.result;
  } catch (error) {
    job.error = error.message;
    job.state = 'failed';
    throw error;
  }
}
