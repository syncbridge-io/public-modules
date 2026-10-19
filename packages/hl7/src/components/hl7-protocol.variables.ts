import { DefineVariable, VariableType } from '@syncbridge/common';
import type { HL7Server } from 'hl7v2-net';

/**
 * The HL7 settings the server and client components share, passed to
 * hl7v2-net as they are. Defined once and applied to both variable classes,
 * which extend different TCP variable classes.
 */
export interface HL7ProtocolVariables {
  acceptAcknowledgment: 'processed' | 'receipt';
  validate: boolean;
  defaultCharset?: string;
  batchAcknowledgment: 'all' | 'errors' | 'none';
}

const DEFINITIONS: Record<keyof HL7ProtocolVariables, DefineVariable.Options> =
  {
    acceptAcknowledgment: {
      label: 'Accept acknowledgment',
      description:
        'When the accept acknowledgment a message asks for (MSH-15) is sent. "processed": after the ' +
        'message is handled - CA when it succeeds, CE when it fails or times out - so a sender is ' +
        'told its data is stored only once it is. "receipt": as soon as the message arrives, ' +
        'before it is handled',
      enumValues: ['processed', 'receipt'],
      default: 'processed',
      index: 300,
      hotPlug: true,
    },
    validate: {
      label: 'Validate messages',
      description:
        "Validate received messages against their HL7 version's definitions; one that fails is " +
        'answered with a NAK listing its errors and is not handled',
      type: VariableType.Boolean,
      default: false,
      index: 310,
      hotPlug: true,
    },
    defaultCharset: {
      label: 'Default character set',
      description:
        'Character set of a message whose MSH-18 is empty or not known, e.g. "windows-1254"; ' +
        'default UTF-8',
      type: VariableType.String,
      index: 320,
      hotPlug: true,
    },
    batchAcknowledgment: {
      label: 'Batch acknowledgment',
      description:
        'Which acknowledgments a received batch is answered with: all of them, only those of ' +
        'messages that failed, or none',
      enumValues: ['all', 'errors', 'none'],
      default: 'all',
      index: 330,
      hotPlug: true,
    },
  };

/** Defines the shared HL7 variables on a variables class */
export function defineHL7ProtocolVariables(target: Function) {
  for (const [key, options] of Object.entries(DEFINITIONS))
    DefineVariable({ ...options })(target.prototype, key);
}

/** The hl7v2-net options the shared variables stand for */
export function hl7ProtocolOptions(
  values: HL7ProtocolVariables,
): Pick<
  HL7Server.Options,
  'acceptAcknowledgment' | 'validate' | 'defaultCharset' | 'batchAcknowledgment'
> {
  return {
    acceptAcknowledgment: values.acceptAcknowledgment || 'processed',
    validate: !!values.validate,
    defaultCharset: values.defaultCharset || undefined,
    batchAcknowledgment: values.batchAcknowledgment || 'all',
  };
}
