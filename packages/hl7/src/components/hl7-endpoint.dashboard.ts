import { DashboardBase, Widget } from '@syncbridge/common';

/** A message received or sent, as the feed lists it */
export interface HL7MessageRow extends Widget.Row {
  direction: 'in' | 'out';
  /** MSH-9: `ORU^R01`, `ACK` */
  type: string;
  /** MSH-10 */
  controlId: string;
  /** An acknowledgment's MSA-1: `AA`, `AE`, `AR`, `CA`, ... */
  ack: string;
  peer: string;
}

/** An endpoint's messages: their rate, their types, the last of them */
export class HL7Dashboard extends DashboardBase {
  /** Counted in the worker: one point a second is sent, however busy */
  @Widget.Chart({
    title: 'Messages',
    series: ['received', 'sent'],
    labels: { received: 'Received', sent: 'Sent' },
    unit: 'msg/s',
    size: { width: 2 },
  })
  declare readonly rate: Widget.Chart;

  @Widget.Stat({ title: 'Errors', thresholds: { warning: 1 } })
  declare readonly errors: Widget.Stat;

  @Widget.Bars({ title: 'Received by type' })
  declare readonly types: Widget.Bars;

  @Widget.Feed({
    title: 'Last messages',
    size: { width: 4 },
    max: 50,
    columns: [
      { field: 'direction', title: 'Direction' },
      { field: 'type', title: 'Type' },
      { field: 'controlId', title: 'Control ID' },
      { field: 'ack', title: 'ACK' },
      { field: 'peer', title: 'Peer' },
    ],
  })
  declare readonly last: Widget.Feed<HL7MessageRow>;
}
