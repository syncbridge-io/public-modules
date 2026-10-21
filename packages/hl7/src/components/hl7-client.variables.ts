import { TcpClientComponent } from '@syncbridge/builtins';
import { DefineVariable, EnumSource } from '@syncbridge/common';
import {
  defineHL7ProtocolVariables,
  type HL7ProtocolVariables,
} from './hl7-protocol.variables.js';

/**
 * Variables
 */
export class HL7ClientVariables
  extends TcpClientComponent.Variables
  implements HL7ProtocolVariables
{
  @DefineVariable({
    label: 'Response timeout',
    description: 'Response timeout in milliseconds',
    default: 30000,
    index: 110,
    hotPlug: true,
  })
  declare responseTimeout: number;

  @DefineVariable({
    label: 'Bind Interface',
    description:
      'Interface address to bind to. If not specified, will bind to all available addresses',
    enumSource: EnumSource.NetworkAddresses,
    index: 120,
    hotPlug: true,
  })
  declare bindInterface?: string;

  declare acceptAcknowledgment: HL7ProtocolVariables['acceptAcknowledgment'];
  declare validate: boolean;
  declare defaultCharset?: string;
  declare batchAcknowledgment: HL7ProtocolVariables['batchAcknowledgment'];
}

defineHL7ProtocolVariables(HL7ClientVariables);
