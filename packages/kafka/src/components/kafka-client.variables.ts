import { DefineVariable, VariableType } from '@syncbridge/common';
import { TcpClientComponent } from '@syncbridge/net';

/**
 * SASL variables
 */
export class KafkaSaslVariables {
  @DefineVariable({
    label: 'Mechanism',
    description: 'SASL mechanism',
    type: VariableType.Enum,
    enumValues: [
      'PLAIN',
      'SCRAM-SHA-256',
      'SCRAM-SHA-512',
      'OAUTHBEARER',
      'GSSAPI',
    ],
    required: true,
    default: 'plain',
    hotPlug: true,
  })
  declare mechanism:
    'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'OAUTHBEARER' | 'GSSAPI';

  @DefineVariable({
    label: 'Username',
    description:
      'Username. Available for "plain", "scram-sha-256" and "scram-sha-512" mechanisms"',
    hotPlug: true,
  })
  declare username?: string;

  @DefineVariable({
    label: 'Password',
    description:
      'Username. Available for "plain", "scram-sha-256" and "scram-sha-512" mechanisms"',
    type: VariableType.Secret,
    hotPlug: true,
  })
  declare password?: string;

  @DefineVariable({
    label: 'Token',
    description: 'Token (etc AWS Session Token).',
    type: VariableType.Secret,
    hotPlug: true,
  })
  declare token?: string;
}

/**
 * Variables
 */
export class KafkaConnectionVariables {
  @DefineVariable({
    label: 'Brokers',
    description:
      'The client must be configured with at least one broker. ' +
      'The brokers on the list are considered seed brokers and are only used to bootstrap the client and load initial metadata.',
    index: 100,
    type: VariableType.String,
    isArray: true,
    required: true,
    hotPlug: true,
  })
  declare brokers: string[];

  @DefineVariable({
    label: 'Client id',
    description:
      'A logical identifier of an application. Can be used by brokers to apply ' +
      'quotas or trace requests to a specific application',
    index: 101,
    hotPlug: true,
  })
  declare clientId?: string;

  @DefineVariable({
    label: 'Timeout',
    description:
      'Timeout in seconds for Kafka requests that support the parameter',
    index: 102,
    default: 5,
    hotPlug: true,
  })
  declare timeout: number;

  @DefineVariable({
    label: 'Retries',
    description:
      'Number of times to retry an operation before failing. `-1` means "infinity"',
    index: 102,
    default: 3,
    minValue: -1,
    hotPlug: true,
  })
  declare retries: number;

  @DefineVariable({
    label: 'Retry Delay',
    description:
      'Amount of time in seconds to wait between retries, or a function to calculate custom delays. See section below.',
    index: 102,
    default: 1,
    hotPlug: true,
  })
  declare retryDelay: number;

  @DefineVariable({
    label: 'Metadata Max Age',
    description: 'Maximum seconds lifetime of cluster metadata.',
    index: 102,
    default: 5,
    minValue: 0,
    hotPlug: true,
  })
  declare metadataMaxAge: number;

  @DefineVariable({
    label: 'Connect timeout',
    description: 'Client connection timeout in seconds.',
    index: 102,
    default: 5,
    minValue: 0,
    hotPlug: true,
  })
  declare connectTimeout: number;

  @DefineVariable({
    label: 'Request timeout',
    description:
      'Local timeout in seconds while waiting for a response to an in-flight request.',
    index: 102,
    default: 30,
    minValue: 0,
    hotPlug: true,
  })
  declare requestTimeout: number;

  @DefineVariable({
    label: 'Max Inflights',
    description:
      'Amount of request to send in parallel to Kafka without awaiting for responses, when allowed from the protocol.   ',
    index: 102,
    default: 5,
    minValue: 0,
    hotPlug: true,
  })
  declare maxInflights: number;

  // ---------------------
  @DefineVariable({
    label: 'SASL Enabled',
    hotPlug: true,
  })
  declare sasl_enabled: boolean;

  @DefineVariable({
    label: 'SASL',
    description: 'SASL authenticate options',
    hotPlug: true,
  })
  declare sasl: KafkaSaslVariables;

  @DefineVariable({
    label: 'TLS Enabled',
    hotPlug: true,
  })
  declare tls_enabled: boolean;

  @DefineVariable({
    label: 'TSL',
    description: 'TSL options',
    hotPlug: true,
  })
  declare tsl: TcpClientComponent.TlsVariables;
}
