import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, VariableType } from '@syncbridge/common';

/**
 * Variables
 */
export class NgrokTcpClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Ngrok Auth Token',
    type: VariableType.Secret,
    description: 'Ngrok auth token',
    required: true,
    hotPlug: true,
  })
  declare authToken: string;

  @DefineVariable({
    label: 'Local Port',
    description:
      'Local port number which ngrok process connection to be served. If not set, a port number will be automatically selected',
    default: 0,
    hotPlug: true,
  })
  declare localPort: number;
}
