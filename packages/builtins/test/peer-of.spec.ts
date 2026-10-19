import { expect } from 'expect';
import { peerOf } from '../src/index.js';

describe('peerOf', () => {
  it('should tell a socket address as address:port', () => {
    expect(peerOf({ address: '10.0.0.5', port: 2575 })).toBe('10.0.0.5:2575');
  });

  it('should tell an address without a port as it is', () => {
    expect(peerOf({ address: '10.0.0.5' })).toBe('10.0.0.5');
  });

  it('should keep a string as it is', () => {
    expect(peerOf('COM3')).toBe('COM3');
  });

  it('should tell nothing for what has no address', () => {
    expect(peerOf(undefined)).toBeUndefined();
    expect(peerOf(null)).toBeUndefined();
    expect(peerOf('')).toBeUndefined();
    expect(peerOf({})).toBeUndefined();
  });
});
