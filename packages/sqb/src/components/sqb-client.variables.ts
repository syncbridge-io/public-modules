import { DefineVariable, VariableType } from '@syncbridge/common';

/**
 * Pool variables
 */
export class SqbClientPoolVariables {
  @DefineVariable({
    label: 'Acquire max retries',
    description:
      'Maximum number that Pool will try to create a resource before returning the error',
    default: 0,
    hotPlug: true,
  })
  declare acquireMaxRetries: number;

  @DefineVariable({
    label: 'Acquire retry wait',
    description: 'Time in millis that Pool will wait after each tries',
    default: 2000,
    hotPlug: true,
  })
  declare acquireRetryWait: number;

  @DefineVariable({
    label: 'Acquire timeout millis',
    description:
      'Time in millis an acquire call will wait for a resource before timing out',
    default: 0,
    hotPlug: true,
  })
  declare acquireTimeoutMillis: number;

  @DefineVariable({
    label: 'Idle timeout',
    description:
      'The minimum amount of time in millis that an resource may sit idle in the Pool',
    default: 30000,
    hotPlug: true,
  })
  declare idleTimeoutMillis: number;

  @DefineVariable({
    label: 'Min',
    description: 'Minimum number of resources that Pool will keep',
    default: 0,
    hotPlug: true,
  })
  declare min: number;

  @DefineVariable({
    label: 'Min idle',
    description:
      'Minimum number of resources that Pool will keep in idle state',
    default: 0,
    hotPlug: true,
  })
  declare minIdle: number;

  @DefineVariable({
    label: 'Max',
    description: 'Maximum number of resources that Pool will create',
    default: 30,
    hotPlug: true,
  })
  declare max: number;

  @DefineVariable({
    label: 'Max queue',
    description: 'Maximum number of request that Pool will accept',
    default: 1000,
    hotPlug: true,
  })
  declare maxQueue: number;
}

/**
 * Variables
 */
export class SqbClientVariables {
  @DefineVariable({
    type: VariableType.Enum,
    label: 'Dialect',
    description: 'Database dialect',
    enumValues: ['postgres', 'oracle', 'mssql', 'mysql', 'mariadb', 'sqlite'],
    required: true,
    hotPlug: true,
  })
  declare dialect: string;

  @DefineVariable({
    label: 'Host',
    description: 'Database server address or url',
    hotPlug: true,
  })
  declare host?: string;

  @DefineVariable({
    label: 'Port',
    description: 'Database listener port number',
    minValue: 1,
    maxValue: 65535,
    hotPlug: true,
  })
  declare port?: number;

  @DefineVariable({
    label: 'Username',
    description: 'Database username',
    hotPlug: true,
  })
  declare username?: string;

  @DefineVariable({
    label: 'Password',
    description: 'Database password',
    type: VariableType.Secret,
    hotPlug: true,
  })
  declare password?: string;

  @DefineVariable({
    label: 'Database name',
    description:
      'Database name to be connected to; for SQLite, the database file path or :memory:',
    hotPlug: true,
  })
  declare database?: string;

  @DefineVariable({
    label: 'Database schema',
    description: 'Database schema to be connected to',
    hotPlug: true,
  })
  declare schema?: string;

  @DefineVariable({
    label: 'Application Name',
    description:
      'Name of the application to be set to database sessions. This is used for debugging purposes',
    default: 'syncbridge',
    hotPlug: true,
  })
  declare applicationName: string;

  @DefineVariable({
    label: 'Pooling',
    description: 'Pooling options',
    hotPlug: true,
  })
  declare pool: SqbClientPoolVariables;
}
