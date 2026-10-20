import { TcpServerComponent } from '@syncbridge/builtins';
import { DefineVariable } from '@syncbridge/common';
import {
  defineHL7ProtocolVariables,
  type HL7ProtocolVariables,
} from './hl7-protocol.variables.js';

/**
 * Variables
 */
export class HL7ServerVariables
  extends TcpServerComponent.Variables
  implements HL7ProtocolVariables
{
  @DefineVariable({
    label: 'Response timeout',
    description:
      'How long a message may take to be handled, in milliseconds; past it the sender is ' +
      'answered with an error acknowledgment',
    default: 30000,
    index: 290,
    hotPlug: true,
  })
  declare responseTimeout: number;

  declare acceptAcknowledgment: HL7ProtocolVariables['acceptAcknowledgment'];
  declare validate: boolean;
  declare defaultCharset?: string;
  declare batchAcknowledgment: HL7ProtocolVariables['batchAcknowledgment'];
}

defineHL7ProtocolVariables(HL7ServerVariables);
