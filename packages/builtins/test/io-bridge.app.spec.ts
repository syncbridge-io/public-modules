import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import { expect } from 'expect';
import { IOBridgeApp } from '../src/index.js';

/** A peer that keeps what is written to it */
class Peer extends EventEmitter {
  written: Buffer[] = [];
  connected = true;
  write(data: Buffer) {
    if (!this.connected) throw new Error('not connected');
    this.written.push(data);
  }
}

/** The app without an engine: _init reads its two peers alone */
async function createApp() {
  const app: any = Object.create(IOBridgeApp.prototype);
  app.peer1 = new Peer();
  app.peer2 = new Peer();
  app.components = {};
  const errors: Error[] = [];
  app.on('error', (e: Error) => errors.push(e));
  await app._init();
  return { app, errors, peer1: app.peer1 as Peer, peer2: app.peer2 as Peer };
}

describe('IOBridgeApp', () => {
  it('should pass what a peer reads on to the other peer', async () => {
    const { peer1, peer2 } = await createApp();
    peer1.emit('data', Buffer.from('to 2'));
    peer2.emit('data', Buffer.from('to 1'));
    expect(peer2.written.map(String)).toEqual(['to 2']);
    expect(peer1.written.map(String)).toEqual(['to 1']);
  });

  it('should tell an error when the other peer cannot be written', async () => {
    const { errors, peer1, peer2 } = await createApp();
    peer2.connected = false;
    peer1.emit('data', Buffer.from('lost'));
    expect(errors.map(e => e.message)).toEqual([
      'Failed to write data to peer2: not connected',
    ]);
  });
});
