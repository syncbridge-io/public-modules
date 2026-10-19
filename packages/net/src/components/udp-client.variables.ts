import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, EnumSource } from '@syncbridge/common';

/**
 * Variables
 */
export class UdpClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Host',
    description: 'Hostname or IP address which udp messages will send to',
    index: 100,
    hotPlug: true,
  })
  declare host?: string;

  @DefineVariable({
    label: 'Port',
    description: 'Port number of target listener',
    minValue: 1,
    maxValue: 65535,
    index: 101,
    hotPlug: true,
  })
  declare port?: number;

  @DefineVariable({
    label: 'Bind Interface',
    description:
      'Interface address to bind to. If not specified, will bind to all available addresses',
    enumSource: EnumSource.NetworkAddresses,
    index: 102,
    hotPlug: true,
  })
  declare bindInterface?: string;
}
