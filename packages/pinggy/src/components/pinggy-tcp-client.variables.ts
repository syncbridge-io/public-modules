import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, VariableType } from '@syncbridge/common';

/**
 * Variables
 */
export class PinggyTcpClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Pinggy Auth Token',
    type: VariableType.Secret,
    description: 'Pinggy auth token. https://dashboard.pinggy.io/managetokens',
    required: true,
    hotPlug: true,
  })
  declare authToken: string;

  @DefineVariable({
    label: 'Local Port',
    description:
      'Local port number which pinggy process connection to be served. If not set, a port number will be automatically selected',
    default: 0,
    hotPlug: true,
  })
  declare localPort: number;
}
