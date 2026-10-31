import path from 'node:path';
import { createTestEnv } from '@syncbridge/testing';
import { expect } from 'expect';
import { RecordsApp } from './_fixtures/sqb-ext/src/index.js';

const FIXTURE = path.resolve(import.meta.dirname, '_fixtures/sqb-ext');

describe('SqbClient dashboard', () => {
  const env = createTestEnv({ from: FIXTURE });

  afterEach(() => env.reset());
  after(() => env.dispose());

  it('should show the database, the queries and what failed', async () => {
    const app = await env.start(RecordsApp, {
      components: {
        db: { values: { dialect: 'sqlite', database: ':memory:' } },
      },
    });
    expect(env.dashboard(app, 'db/database/link')).toMatchObject({
      value: { status: 'ok', text: 'Connected to sqlite' },
    });

    const client = app.db.getClient();
    await client.execute('select 1 as one');
    await expect(client.execute('select * from missing')).rejects.toThrow();
    /* Every connection went back to the pool */
    expect(env.dashboard(app, 'db/database/inUse')).toMatchObject({ value: 0 });
    expect(env.dashboard(app, 'db/database/errors')).toMatchObject({
      value: 1,
    });
    env.flushCounts(app);
    expect(env.dashboard(app, 'db/database/rate')).toMatchObject({
      series: {
        queries: [[expect.any(Number), 2]],
        errors: [[expect.any(Number), 1]],
      },
    });
    expect(env.dashboardIssues(app)).toEqual({});
  });
});
