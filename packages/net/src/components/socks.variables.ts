import { DefineVariable, VariableType } from '@syncbridge/common';

/**
 * Variables
 */
export class SocksVariables {
  @DefineVariable({
    label: 'Host',
    description: 'Hostname or IP address of proxy server',
    required: true,
    index: 100,
    hotPlug: true,
  })
  declare host: string;

  @DefineVariable({
    label: 'Port',
    description: 'Port number of proxy listener',
    required: true,
    minValue: 1,
    maxValue: 65535,
    index: 101,
    hotPlug: true,
  })
  declare port: number;

  @DefineVariable({
    label: 'Proxy type',
    description: 'SOCKS protocol version of the proxy',
    index: 102,
    enumValues: ['v4', 'v5'],
    type: VariableType.Enum,
    default: 'v5',
    hotPlug: true,
  })
  declare proxyType: 'v4' | 'v5';

  @DefineVariable({
    label: 'Username',
    description: 'Username to be used for authentication',
    hotPlug: true,
  })
  declare username?: string;

  @DefineVariable({
    label: 'Password',
    description: 'Password to be used for authentication',
    hotPlug: true,
    type: VariableType.Secret,
  })
  declare password?: string;
}
