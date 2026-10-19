import type * as ioredis from 'ioredis';
import { noOp } from '../constants.js';

/**
 * Quits a client, and returns once it has ended: it connects again from
 * there. A client left connecting or waiting to retry is disconnected, or it
 * would keep trying after it was stopped.
 */
export async function stopClient(client: ioredis.Redis): Promise<void> {
  if (client.status === 'end') return;
  const ended = new Promise<void>(resolve => client.once('end', resolve));
  if (client.status === 'ready') await client.quit().catch(noOp);
  // A server that does not hang up after QUIT is not waited for
  // (the status moves while quit() is awaited)
  if ((client.status as string) !== 'end') client.disconnect();
  await ended;
}
