import { expect } from 'expect';
import { tcpServerVariablesToNodeOptions } from '../src/components/tcp-server.variables.js';

describe('tcpServerVariablesToNodeOptions', () => {
  const values: any = {
    socket: {
      keepAlive: true,
      blockedIps: ['10.0.0.1', '10.1.0.1-10.1.0.9'],
      blockedSubnets: ['192.168.0.0,16', 'fe80::,10,ipv6'],
    },
  };

  it('should block the addresses, ranges and subnets it is given, all together', () => {
    const { blockList } = tcpServerVariablesToNodeOptions(values) as any;
    expect(blockList.check('10.0.0.1')).toBe(true);
    expect(blockList.check('10.1.0.5')).toBe(true);
    expect(blockList.check('192.168.5.5')).toBe(true);
    expect(blockList.check('fe80::1', 'ipv6')).toBe(true);
    expect(blockList.check('10.0.0.2')).toBe(false);
  });

  it('should keep the lists out of the options it hands to Node', () => {
    const options: any = tcpServerVariablesToNodeOptions(values);
    expect(options.keepAlive).toBe(true);
    expect(options).not.toHaveProperty('blockedIps');
    expect(options).not.toHaveProperty('blockedSubnets');
  });

  it('should use TLS options only when TLS is enabled', () => {
    const tls = { key: 'KEY', cert: 'CERT' };
    expect(tcpServerVariablesToNodeOptions({ tls } as any)).not.toHaveProperty(
      'key',
    );
    expect(
      tcpServerVariablesToNodeOptions({ tls_enabled: true, tls } as any),
    ).toMatchObject(tls);
  });
});
