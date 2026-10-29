import { App, AppBase } from '@syncbridge/common';
import { IoClientBaseComponent } from '../components.js';

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

  protected async _init(): Promise<void> {
    await super._init();
    this.peer1.on('data', (data: Buffer) => {
      try {
        this.peer2.write(data);
      } catch (err: any) {
        err.message = `Failed to write data to peer2: ${err.message}`;
        this.emit('error', err);
      }
    });
    this.peer2.on('data', (data: Buffer) => {
      try {
        this.peer1.write(data);
      } catch (err: any) {
        err.message = `Failed to write data to peer1: ${err.message}`;
        this.emit('error', err);
      }
    });
  }
}
