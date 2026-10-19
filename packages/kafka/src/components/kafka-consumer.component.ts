import {
  Consumer,
  FetchIsolationLevels,
  type Message,
  MessagesStream,
} from '@platformatic/kafka';
import {
  Component,
  ComponentBase,
  LogChannel,
  ServiceStatus,
} from '@syncbridge/common';
import { TcpClientComponent } from '@syncbridge/net';
import { noOp } from '../constants.js';
import {
  COMMUNICATION_CHANNEL,
  messageData,
  messageDetails,
} from '../utils/communication.js';
import { KafkaSaslVariables } from './kafka-client.variables.js';
import { KafkaConsumerVariables } from './kafka-consumer.variables.js';

/**
 * KafkaConsumer component
 */
@Component({
  className: 'KafkaConsumer',
  displayName: 'Kafka Consumer',
  description: 'Kafka consumer component',
  tags: ['consumer'],
})
export class KafkaConsumerComponent<
  TEvents extends KafkaConsumerComponent.Events = KafkaConsumerComponent.Events,
> extends ComponentBase<TEvents> {
  protected _stopping?: boolean;
  declare consumer: Consumer;
  declare stream: MessagesStream<any, any, any, any>;

  @Component.UseVariables()
  declare values: KafkaConsumerVariables;

  @LogChannel(COMMUNICATION_CHANNEL)
  declare readonly communicationLog: LogChannel;

  protected async _init(): Promise<void> {
    await super._init();
    this.on('values-updated', async () => {
      await this._configureConsumer();
    });
    await this._configureConsumer();
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    await this._startConsumer();
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await this.consumer.close();
    return super._stop();
  }

  protected async _terminate(): Promise<void> {
    this.consumer.close(true);
  }

  protected async _configureConsumer() {
    const isStopped = this.stopped;
    this.setStatus(ServiceStatus.starting);
    await this.consumer?.close();
    try {
      this.consumer = new Consumer({
        // Client options
        clientId: this.values.connection.clientId || this._context.path,
        bootstrapBrokers: this.values.connection.brokers,
        timeout: this.values.connection.timeout,
        retries:
          this.values.connection.retries < 0
            ? true
            : this.values.connection.retries,
        retryDelay: this.values.connection.retryDelay * 1000,
        metadataMaxAge: this.values.connection.metadataMaxAge * 1000,
        connectTimeout: this.values.connection.connectTimeout * 1000,
        requestTimeout: this.values.connection.requestTimeout * 1000,
        maxInflights: this.values.connection.maxInflights,
        ssl: this.values.connection.tls_enabled
          ? this.values.connection.tsl
          : undefined,
        tlsServerName: this.values.connection.tls_enabled
          ? this.values.connection.tsl?.servername
          : undefined,
        sasl: this.values.connection.sasl_enabled
          ? this.values.connection.sasl
          : undefined,
        // Consumer options
        groupId: this.values.groupId,
        groupInstanceId: this.values.groupInstanceId,
        autocommit: this.values.autocommit,
        autocreateTopics: this.values.autocreateTopics,
        minBytes: this.values.minBytes,
        maxBytes: this.values.maxBytes,
        maxWaitTime: this.values.maxWaitTime * 1000,
        isolationLevel:
          this.values.isolationLevel === 'read-committed'
            ? FetchIsolationLevels.READ_COMMITTED
            : FetchIsolationLevels.READ_UNCOMMITTED,
        highWaterMark: this.values.highWaterMark,
        sessionTimeout: this.values.sessionTimeout * 1000,
        rebalanceTimeout: this.values.rebalanceTimeout * 1000,
        heartbeatInterval: this.values.heartbeatInterval * 1000,
        groupProtocol: this.values.groupProtocol,
      });

      this.consumer.on('client:broker:connect', () => {
        this.emit('status-change', ServiceStatus.started);
        this.communicationLog?.write({
          direction: 'info',
          event: 'connect',
          message: 'Connected',
        });
        this.emit('connect');
      });
      this.consumer.on('client:broker:failed', () => {
        this.emit(
          'status-change',
          ServiceStatus.unhealthy,
          'Kafka broker failed',
        );
      });
      this.consumer.on('client:broker:disconnect', () => {
        if (!this._stopping) {
          this.emit(
            'status-change',
            ServiceStatus.unhealthy,
            new Error('Kafka broker disconnected unexpectedly'),
          );
        }
        this.communicationLog?.write({
          direction: 'info',
          event: 'disconnect',
          message: 'Disconnected',
        });
        this.emit('disconnect');
      });
      if (!isStopped) {
        await this._startConsumer();
      }
    } catch (err: any) {
      this.logger?.error(err);
      this.setStatus(ServiceStatus.unhealthy, err.message);
    }
  }

  protected async _startConsumer(): Promise<void> {
    await Promise.resolve()
      .then(async () => {
        this.stream = await this.consumer.consume({
          topics: this.values.topics,
          mode: this.values.mode,
          fallbackMode: this.values.fallbackMode,
          maxFetches: this.values.maxFetches,
        });
        this.stream.on('data', message => {
          this._onMessage(message).catch(noOp);
        });
      })
      .catch(async e => {
        this.emit('error', e);
        this.emit('status-change', ServiceStatus.unhealthy, e);
      });
  }

  protected async _onMessage(message: Message<any, any, any, any>) {
    this.communicationLog?.write({
      direction: 'in',
      data: messageData(message.value),
      details: messageDetails(message),
    });
    this.emit('message', message);
  }
}

/**
 * @namespace
 */
export namespace KafkaConsumerComponent {
  export interface Events extends ComponentBase.Events {
    message: [msg: Message<any, any, any, any>];
  }

  export const Variables = KafkaConsumerVariables;
  export type Variables = KafkaConsumerVariables;
  export const SaslVariables = KafkaSaslVariables;
  export type SaslVariables = KafkaSaslVariables;
  export const TlsVariables: typeof TcpClientComponent.TlsVariables =
    TcpClientComponent.TlsVariables;
  export type TlsVariables = TcpClientComponent.TlsVariables;
}
