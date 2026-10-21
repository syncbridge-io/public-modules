import net, { type ServerOpts } from 'node:net';
import tls from 'node:tls';
import { omit } from '@jsopen/objects';
import { DefineVariable, EnumSource, VariableType } from '@syncbridge/common';
import type { StrictOmit } from 'ts-gems';
import { IoServerBaseComponent } from './io-server-base.component.js';

/**
 * TLS variables
 */
export class TcpServerTlsVariables implements tls.TlsOptions {
  @DefineVariable({
    label: 'Cert',
    description:
      'Cert chains in PEM format. One cert chain should be provided per private key. ' +
      'Each cert chain should consist of the PEM formatted certificate for a provided private key, ' +
      'followed by the PEM formatted intermediate certificates (if any), in order, and not including ' +
      'the root CA (the root CA must be pre-known to the peer, see ca). When providing multiple cert chains, ' +
      'they do not have to be in the same order as their private keys in key. ' +
      'If the intermediate certificates are not provided, the peer will not be able to validate the certificate, ' +
      'and the handshake will fail.',
    required: true,
  })
  declare cert: string;

  @DefineVariable({
    label: 'Key',
    description:
      'Private keys in PEM format. PEM allows the option of private keys being encrypted. ' +
      'Encrypted keys will be decrypted with options.passphrase. ',
    required: true,
  })
  declare key: string;

  @DefineVariable({
    type: VariableType.Secret,
    label: 'Passphrase',
    description:
      'Shared passphrase used for a single private key and/or a PFX.',
  })
  declare passphrase?: string;

  @DefineVariable({
    label: 'CA certificates',
    description:
      'Optionally override the trusted CA certificates. Default is to trust the well-known CAs ' +
      "curated by Mozilla. Mozilla's CAs are completely replaced when CAs are explicitly specified " +
      'using this option.',
    required: true,
  })
  declare ca?: string;

  @DefineVariable({
    label: 'CRL (Certificate Revocation Lists)',
    description: 'PEM formatted CRLs',
  })
  declare crl?: string;

  @DefineVariable({
    label: 'Reject unauthorized',
    description:
      'If not false the server will reject any connection which is not authorized with the list of supplied CAs. ' +
      'This option only has an effect if requestCert is true',
    default: true,
  })
  declare rejectUnauthorized?: boolean;

  @DefineVariable({
    label: 'Handshake Timeout',
    description:
      'Abort the connection if the SSL/TLS handshake does not finish in the specified number of milliseconds.',
    default: 120000,
  })
  declare handshakeTimeout?: number;

  @DefineVariable({
    label: 'Request cert',
    description:
      'If true the server will request a certificate from clients that connect and attempt to verify that certificate.',
    default: false,
  })
  declare requestCert?: boolean;

  @DefineVariable({
    label: 'Session Timeout',
    description:
      'The number of seconds after which a TLS session created by the server will no longer be resumable',
  })
  declare sessionTimeout?: number;

  @DefineVariable({
    label: 'Allow Partial Trust Chain',
    description:
      'Treat intermediate (non-self-signed) certificates in the trust CA certificate list as trusted.',
  })
  declare allowPartialTrustChain?: boolean;

  @DefineVariable({
    label: 'Sigalgs',
    description:
      'Colon-separated list of supported signature algorithms. ' +
      'The list can contain digest algorithms (SHA256, MD5 etc.), public key algorithms (RSA-PSS, ECDSA etc.), ' +
      "combination of both (e.g 'RSA+SHA384') or TLS v1.3 scheme names (e.g. rsa_pss_pss_sha512). " +
      'See [OpenSSL man pages](https://docs.openssl.org/1.1.1/man3/SSL_CTX_set1_sigalgs) for more info.',
  })
  declare sigalgs?: string;
}

/**
 * Variables
 */
export class TcpServerSocketOptions implements StrictOmit<
  ServerOpts,
  'blockList'
> {
  @DefineVariable({
    label: 'Allow Half Open',
    description: 'Indicates whether half-opened TCP connections are allowed.',
    default: false,
    index: 130,
  })
  declare allowHalfOpen?: boolean;

  @DefineVariable({
    label: 'Keep Alive',
    description:
      'If set to true, it enables keep-alive functionality on the socket immediately after a new incoming connection is received',
    default: false,
    index: 130,
  })
  declare keepAlive?: boolean;

  @DefineVariable({
    label: 'Keep Alive Initial Delay',
    description:
      'If set to a positive number, it sets the initial delay before the first keepalive probe is sent on an idle socket.',
    default: 0,
    index: 130,
  })
  declare keepAliveInitialDelay?: number;

  @DefineVariable({
    label: 'No Delay',
    description:
      "If set to true, it disables the use of Nagle's algorithm immediately after a new incoming connection is received.",
    default: true,
    index: 130,
  })
  declare noDelay?: boolean;

  @DefineVariable({
    label: 'Blocked Ips',
    description:
      'A List of blocked IP addresses. ' +
      'This does not work if the server is behind a reverse proxy, NAT, etc. because the address checked against ' +
      'the block list is the address of the proxy, or the one specified by the NAT.',
    type: VariableType.String,
    isArray: true,
    index: 130,
  })
  declare blockedIps?: string[];

  @DefineVariable({
    label: 'Blocked Subnets',
    description:
      'A List of blocked Subnet addresses. ' +
      'This does not work if the server is behind a reverse proxy, NAT, etc. because the address checked against ' +
      'the block list is the address of the proxy, or the one specified by the NAT.',
    type: VariableType.String,
    isArray: true,
    index: 130,
  })
  declare blockedSubnets?: string[];
}

/**
 * Variables
 */
export class TcpServerVariables extends IoServerBaseComponent.Variables {
  @DefineVariable({
    label: 'Port',
    description: 'Port number to be listen',
    required: true,
    minValue: 1,
    maxValue: 65535,
    index: 100,
  })
  declare port: number;

  @DefineVariable({
    label: 'Bind Interface',
    description:
      'Interface address to bind to. If not specified, will bind to all available addresses',
    enumSource: EnumSource.NetworkAddresses,
    index: 120,
  })
  declare bindInterface?: string;

  @DefineVariable({
    label: 'TLS Enabled',
    description: 'Whether to use TLS for the connection',
    index: 200,
  })
  declare tls_enabled: boolean;

  @DefineVariable({
    label: 'TLS',
    description: 'TLS options',
    index: 200,
  })
  declare tls: TcpServerTlsVariables;

  @DefineVariable({
    label: 'Socket',
    description: 'Socket options',
    index: 200,
  })
  declare socket: TcpServerSocketOptions;
}

export function tcpServerVariablesToNodeOptions(
  values: TcpServerVariables,
): tls.TlsOptions {
  const serverOptions: net.ServerOpts = {};
  if (values.socket) {
    const socketOptions: net.ServerOpts = omit(values.socket, [
      'blockedIps',
      'blockedSubnets',
    ]);
    if (values.socket.blockedIps?.length) {
      serverOptions.blockList = new net.BlockList();
      for (const ip of values.socket.blockedIps) {
        if (ip.includes('-')) {
          const [ip1, ip2] = ip.split('-');
          serverOptions.blockList.addRange(ip1, ip2);
        } else serverOptions.blockList.addAddress(ip);
      }
    }
    if (values.socket.blockedSubnets?.length) {
      // Both lists block: the subnets are added to the one of the addresses
      serverOptions.blockList ??= new net.BlockList();
      for (const ip of values.socket.blockedSubnets) {
        const [address, prefix, type] = ip.split(/[,;|]/);
        const family = type === 'ipv6' ? 'ipv6' : 'ipv4';
        serverOptions.blockList.addSubnet(
          address,
          parseInt(prefix, 10) || (family === 'ipv6' ? 128 : 32),
          family,
        );
      }
    }
    Object.assign(serverOptions, socketOptions);
  }

  if (values.tls_enabled && values.tls) {
    Object.assign(serverOptions, values.tls);
  }

  return serverOptions;
}
