import { DashboardBase, Widget } from '@syncbridge/common';

/** A Redis client's connection: whether it is up, and how often it dropped */
export class RedisDashboard extends DashboardBase {
  @Widget.Status({ title: 'Redis' })
  declare readonly link: Widget.Status;

  @Widget.Stat({ title: 'Reconnects' })
  declare readonly reconnects: Widget.Stat;
}
