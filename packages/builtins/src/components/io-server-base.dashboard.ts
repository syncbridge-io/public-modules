import { DashboardBase, Widget } from '@syncbridge/common';

/** One connection's row */
export interface IoServerConnectionRow extends Widget.Row {
  peer: string;
  since: Date;
  received: number;
  sent: number;
}

/** A server's connections: how many, and what each one moved */
export class IoServerDashboard extends DashboardBase {
  @Widget.Stat({ title: 'Connections' })
  declare readonly count: Widget.Stat;

  @Widget.Table({
    title: 'Connected peers',
    size: { width: 3 },
    columns: [
      { field: 'peer', title: 'Peer' },
      { field: 'since', title: 'Since', format: 'time' },
      { field: 'received', title: 'Received', format: 'bytes' },
      { field: 'sent', title: 'Sent', format: 'bytes' },
    ],
  })
  declare readonly connections: Widget.Table<IoServerConnectionRow>;
}
