import { App, AppBase } from '@syncbridge/common';
import { SerialClientComponent } from '@syncbridge/serialport';

/** Answers what a device on its serial port sends, in capitals */
@App({ displayName: 'Serial echo' })
export class SerialEchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly line: SerialClientComponent;

  readonly received: string[] = [];

  protected async _init(): Promise<void> {
    await super._init();
    this.line.on('data', (data: Buffer) => {
      const text = data.toString('latin1');
      this.received.push(text);
      this.line.write(text.toUpperCase());
    });
  }
}
