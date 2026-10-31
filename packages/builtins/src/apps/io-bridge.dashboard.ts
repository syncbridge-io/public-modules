import { DashboardBase, DashboardSections, Widget } from '@syncbridge/common';

/**
 * The bridge and its two peers on one tab. The peers' widgets are the
 * components' own, included by the app into the sections named after them.
 */
@DashboardSections([
  { id: 'bridge', title: 'Bridge' },
  { id: 'peer1', title: 'Peer 1' },
  { id: 'peer2', title: 'Peer 2' },
])
export class IOBridgeDashboard extends DashboardBase {
  /** Bytes a second passed on, summed in the worker */
  @Widget.Chart({
    title: 'Forwarded',
    section: 'bridge',
    series: ['peer1 to peer2', 'peer2 to peer1'],
    unit: 'B/s',
    size: { width: 2 },
  })
  declare readonly forwarded: Widget.Chart;

  @Widget.Stat({
    title: 'Dropped',
    section: 'bridge',
    format: 'bytes',
    thresholds: { warning: 1 },
  })
  declare readonly dropped: Widget.Stat;

  @Widget.Status({ title: 'Last error', section: 'bridge' })
  declare readonly lastError: Widget.Status;
}
