import { DashboardBase, Widget } from '@syncbridge/common';

/** A Kafka client at a glance: its brokers, its messages, its errors */
export class KafkaDashboard extends DashboardBase {
  @Widget.Status({ title: 'Brokers' })
  declare readonly link: Widget.Status;

  /** Counted in the worker: one point a second is sent, however busy */
  @Widget.Chart({
    title: 'Messages',
    series: ['messages'],
    labels: { messages: 'Messages' },
    unit: 'msg/s',
    size: { width: 2 },
  })
  declare readonly rate: Widget.Chart;

  @Widget.Stat({ title: 'Errors', thresholds: { warning: 1 } })
  declare readonly errors: Widget.Stat;

  @Widget.Bars({ title: 'Messages by topic' })
  declare readonly topics: Widget.Bars;
}
