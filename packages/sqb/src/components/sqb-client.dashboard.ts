import { DashboardBase, Widget } from '@syncbridge/common';

/** A database client at a glance: its database, its queries, its pool */
export class SqbClientDashboard extends DashboardBase {
  @Widget.Status({ title: 'Database' })
  declare readonly link: Widget.Status;

  /** Counted in the worker: one point a second is sent, however busy */
  @Widget.Chart({
    title: 'Queries',
    series: ['queries', 'errors'],
    labels: { queries: 'Queries', errors: 'Errors' },
    unit: '/s',
    size: { width: 2 },
  })
  declare readonly rate: Widget.Chart;

  @Widget.Stat({ title: 'Errors', thresholds: { warning: 1 } })
  declare readonly errors: Widget.Stat;

  @Widget.Stat({ title: 'Connections in use' })
  declare readonly inUse: Widget.Stat;
}
