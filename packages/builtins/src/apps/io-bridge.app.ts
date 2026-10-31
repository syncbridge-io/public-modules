import { App, AppBase, UseDashboard } from '@syncbridge/common';
import { IoClientBaseComponent } from '../components.js';
import { IOBridgeDashboard } from './io-bridge.dashboard.js';

@App({
  className: 'IOBridge',
  formerly: 'IOBridgeApp',
  displayName: 'IO Bridge',
  description: 'Create a bridge between two IO peers',
  summary:
    'Connects two IO peers: what one reads, it writes to the other, for example a serial port to a TCP socket.',
  tags: ['io', 'bridge'],
})
export class IOBridgeApp extends AppBase {
  @App.UseComponent({
    required: true,
  })
  declare readonly peer1: IoClientBaseComponent;

  @App.UseComponent({
    required: true,
  })
  declare readonly peer2: IoClientBaseComponent;

  /** What it passed on and dropped, beside each peer's own widgets */
  @UseDashboard({
    title: 'Bridge',
    include: [
      { component: 'peer1', section: 'peer1' },
      { component: 'peer2', section: 'peer2' },
    ],
  })
  declare readonly bridge: IOBridgeDashboard;

  protected _dropped!: number;

  protected async _init(): Promise<void> {
    await super._init();
    this._dropped = 0;
    this.bridge?.dropped.set(0);
    this.bridge?.lastError.set('ok', 'No errors');
    this.peer1.on('data', (data: Buffer) => this._pass(data, 'peer2'));
    this.peer2.on('data', (data: Buffer) => this._pass(data, 'peer1'));
  }

  protected _pass(data: Buffer, to: 'peer1' | 'peer2') {
    try {
      this[to].write(data);
      this.bridge?.forwarded.count(
        to === 'peer2' ? 'toPeer2' : 'toPeer1',
        data.length,
      );
    } catch (err: any) {
      err.message = `Failed to write data to ${to}: ${err.message}`;
      this._dropped += data.length;
      this.bridge?.dropped.set(this._dropped);
      this.bridge?.lastError.set('error', err.message);
      this.emit('error', err);
    }
  }
}
