import type net from 'node:net';
import { TcpClientComponent, TcpServerComponent } from '@syncbridge/builtins';
import { App, AppBase, DashboardBase, UseDashboard } from '@syncbridge/common';

/**
 * Answers what it is sent in capitals, and greets a device it connects to,
 * keeping what the device says
 */
@App({ displayName: 'Echo' })
export class EchoApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly listener: TcpServerComponent;

  @App.UseComponent()
  declare readonly device?: TcpClientComponent;

  /* The server's widgets all, the client's link and traffic only */
  @UseDashboard({ title: 'Listener', include: [{ component: 'listener' }] })
  declare readonly listenerTab: DashboardBase;

  @UseDashboard({
    title: 'Device',
    include: [{ component: 'device', widgets: ['link', 'traffic'] }],
  })
  declare readonly deviceTab: DashboardBase;

  readonly fromDevice: string[] = [];

  protected async _init(): Promise<void> {
    await super._init();
    this.listener.server.on('connection', (socket: net.Socket) =>
      socket.on('data', (data: Buffer) =>
        socket.write(data.toString('latin1').toUpperCase(), 'latin1'),
      ),
    );
    this.device?.on('connect', () => this.device!.write('hello'));
    this.device?.on('data', (data: Buffer) =>
      this.fromDevice.push(data.toString()),
    );
  }
}
