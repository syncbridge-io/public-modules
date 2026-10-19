import { expect } from 'expect';
import { SqbClientComponent } from '../src/components/sqb-client.component.js';

describe('SqbClientComponent', () => {
  it('should write the SQL it runs and what fails to its queries channel', async () => {
    const component: any = Object.create(SqbClientComponent.prototype);
    component.values = { dialect: 'postgres', host: '127.0.0.1', pool: {} };
    component.components = {};
    const records: any[] = [];
    component.queriesLog = { write: (r: any) => records.push(r) };
    await component._init();
    try {
      component.client.emit('execute', {
        sql: 'select * from orders where id = :id',
        params: { id: 1 },
      });
      component.client.emit('error', new Error('refused'));
      expect(records.map(r => [r.event, r.level, r.message, r.fields])).toEqual(
        [
          [
            'execute',
            'info',
            'select * from orders where id = :id',
            { params: { id: 1 } },
          ],
          ['error', 'error', 'refused', undefined],
        ],
      );
    } finally {
      await component.client.close();
    }
  });
});
