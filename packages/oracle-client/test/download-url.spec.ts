import { expect } from 'expect';
import {
  DEFAULT_INSTANT_CLIENT_VERSION,
  INSTANT_CLIENT_VERSIONS,
} from '../src/plugins/oracle-client.variables.js';
import { downloadUrlOf } from '../src/utils/download-url.js';

describe('downloadUrlOf', () => {
  it('should build the address Oracle serves for 23 and later', () => {
    expect(downloadUrlOf('23.9.0.25.07', 'x64')).toBe(
      'https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-basic-linux.x64-23.9.0.25.07.zip',
    );
    expect(downloadUrlOf('23.26.4.0.0', 'x64')).toBe(
      'https://download.oracle.com/otn_software/linux/instantclient/2326400/instantclient-basic-linux.x64-23.26.4.0.0.zip',
    );
    expect(downloadUrlOf('23.9.0.25.07', 'arm64')).toBe(
      'https://download.oracle.com/otn_software/linux/instantclient/2390000/instantclient-basic-linux.arm64-23.9.0.25.07.zip',
    );
  });

  it('should keep the dbru suffix of 21 and earlier', () => {
    expect(downloadUrlOf('21.13.0.0.0', 'x64')).toBe(
      'https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-basic-linux.x64-21.13.0.0.0dbru.zip',
    );
    expect(downloadUrlOf('19.33.0.0.0', 'x64')).toBe(
      'https://download.oracle.com/otn_software/linux/instantclient/1933000/instantclient-basic-linux.x64-19.33.0.0.0dbru.zip',
    );
  });

  it('should refuse an architecture Oracle does not publish for', () => {
    expect(() => downloadUrlOf('23.9.0.25.07', 'ppc64')).toThrow(
      'no Instant Client for "ppc64"',
    );
  });

  it('should refuse a version that is not one', () => {
    expect(() => downloadUrlOf('latest', 'x64')).toThrow(
      'is not an Instant Client version',
    );
  });

  it('should build an address for every version offered, on both architectures', () => {
    for (const version of INSTANT_CLIENT_VERSIONS)
      for (const arch of ['x64', 'arm64'])
        expect(downloadUrlOf(version, arch)).toContain(
          `instantclient-basic-linux.${arch}-${version}`,
        );
  });

  it('should offer its default among the versions', () => {
    expect(INSTANT_CLIENT_VERSIONS).toContain(DEFAULT_INSTANT_CLIENT_VERSION);
  });
});
