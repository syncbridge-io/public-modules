import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, VariableType } from '@syncbridge/common';
import { getInterfaceAddresses } from '../utils/get-interface-address.js';

/**
 * Variables
 */
export class UdpListenerVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Port',
    description: 'Port number of target listener',
    required: true,
    minValue: 1,
    maxValue: 65535,
    index: 100,
    hotPlug: true,
  })
  declare port: number;

  @DefineVariable({
    label: 'Broadcast',
    description:
      "Sets the SO_BROADCAST socket option. When set to true, UDP packets may be sent to a local interface's broadcast address.",
    index: 101,
    hotPlug: true,
  })
  declare broadcast?: boolean;

  @DefineVariable({
    label: 'Multicast Groups',
    description: 'Multicast groups to be joined',
    type: VariableType.String,
    isArray: true,
    index: 102,
    hotPlug: true,
  })
  declare multicastGroups?: string[];

  @DefineVariable({
    label: 'Bind Interface',
    description:
      'Interface address to bind to. If not specified, will bind to all available addresses',
    type: VariableType.Enum,
    enumValues: getInterfaceAddresses(),
    index: 103,
    hotPlug: true,
  })
  declare bindInterface?: string;

  @DefineVariable({
    label: 'Multicast Interface',
    description: 'Interface address to bind for multicast packages',
    type: VariableType.Enum,
    enumValues: getInterfaceAddresses(),
    index: 104,
    hotPlug: true,
  })
  declare multicastInterface?: string;
}
