import { DashboardBase, Widget } from '@syncbridge/common';

/** A client's link at a glance: whether it is up, and what went over it */
export class IoClientDashboard extends DashboardBase {
  @Widget.Status({ title: 'Link' })
  declare readonly link: Widget.Status;

  @Widget.Stat({ title: 'Received', format: 'bytes' })
  declare readonly received: Widget.Stat;

  @Widget.Stat({ title: 'Sent', format: 'bytes' })
  declare readonly sent: Widget.Stat;
}
