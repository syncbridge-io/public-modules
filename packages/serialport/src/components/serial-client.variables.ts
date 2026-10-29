import { IoClientBaseComponent } from '@syncbridge/builtins';
import { DefineVariable, EnumSource, VariableType } from '@syncbridge/common';

/**
 * Reconnect variables
 */
export class SerialClientReconnectVariables {
  @DefineVariable({
    type: VariableType.Enum,
    label: 'Reconnection strategy',
    enumValues: ['fibonacci', 'exponential'],
    default: 'fibonacci',
    hotPlug: true,
  })
  declare strategy: 'fibonacci' | 'exponential';

  @DefineVariable({
    label: 'Initial delay',
    description: 'Initial delay in milliseconds',
    default: 2000,
    hotPlug: true,
  })
  declare initialDelay: number;

  @DefineVariable({
    label: 'Maximum delay',
    description: 'Maximum delay in milliseconds',
    default: 10000,
    hotPlug: true,
  })
  declare maxDelay: number;
}

/**
 * Variables
 */
export class SerialClientVariables extends IoClientBaseComponent.Variables {
  @DefineVariable({
    label: 'Port',
    description:
      'The port or the system path of the serial port you want to open. For example, `/dev/tty.XXX` on Mac/Linux, or `COM1` on Windows',
    required: true,
    enumSource: EnumSource.SerialPorts,
    index: 100,
    hotPlug: true,
  })
  declare port: string;

  @DefineVariable({
    type: VariableType.Number,
    label: 'Baud rate',
    description:
      'The baud rate of the port to be opened. This should match one of the commonly available ' +
      'baud rates, such as 110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, or 115200. ' +
      'Custom rates are supported best effort per platform. The device connected to the serial port ' +
      'is not guaranteed to support the requested baud rate, even if the port itself supports that baud rate.',
    default: 9600,
    required: true,
    index: 101,
    hotPlug: true,
  })
  declare baudRate: number;

  @DefineVariable({
    type: VariableType.Enum,
    label: 'Data bits',
    enumValues: ['5', '6', '7', '8'],
    default: '8',
    required: true,
    index: 102,
    hotPlug: true,
  })
  declare dataBits: string;

  @DefineVariable({
    type: VariableType.Enum,
    label: 'Stop bits',
    enumValues: ['1', '1.5', '2'],
    default: '1',
    index: 103,
    hotPlug: true,
  })
  declare stopBits: string;

  @DefineVariable({
    type: VariableType.Enum,
    label: 'Parity',
    enumValues: ['none', 'even', 'mark', 'odd', 'space'],
    default: 'none',
    index: 104,
    hotPlug: true,
  })
  declare parity: string;

  @DefineVariable({
    label: 'RTS/CTS',
    description: 'RTS/CTS flow control',
    default: false,
    index: 105,
    hotPlug: true,
  })
  declare rtscts: boolean;

  @DefineVariable({
    label: 'XON',
    description: 'XON flow control',
    default: false,
    index: 106,
    hotPlug: true,
  })
  declare xon: boolean;

  @DefineVariable({
    label: 'XOFF',
    description: 'XOFF flow control',
    default: false,
    index: 107,
    hotPlug: true,
  })
  declare xoff: boolean;

  @DefineVariable({
    label: 'XANY',
    description: 'XANY flow control',
    default: false,
    index: 108,
    hotPlug: true,
  })
  declare xany: boolean;

  @DefineVariable({
    label: 'HUPCL',
    description: 'Drop DTR on close if enabled',
    default: true,
    index: 109,
    hotPlug: true,
  })
  declare hupcl: boolean;

  @DefineVariable({
    label: 'Reconnect Options',
    description: 'How the connection is retried when it fails or is lost',
    hotPlug: true,
  })
  declare reconnect: SerialClientReconnectVariables;
}
