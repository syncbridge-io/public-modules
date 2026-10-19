import type {
  ProduceResult,
  SendOptions,
  Serializers,
} from '@platformatic/kafka';
import { ProduceAcks, Producer } from '@platformatic/kafka';
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
import { KafkaProducerVariables } from './kafka-producer.variables.js';

export const kTransaction = Symbol('plt.kafka.producer.transactions');

/**
 * KafkaProducer component
 */
@Component({
  className: 'KafkaProducer',
  displayName: 'Kafka Producer',
  description: 'Kafka producer component',
  tags: ['producer'],
})
export class KafkaProducerComponent<
  TEvents extends KafkaProducerComponent.Events = KafkaProducerComponent.Events,
  Key = Buffer,
  Value = Buffer,
  HeaderKey = Buffer,
  HeaderValue = Buffer,
> extends ComponentBase<TEvents> {
  protected _stopping?: boolean;
  declare producer: Producer<Key, Value, HeaderKey, HeaderValue>;

  @Component.UseVariables()
  declare values: KafkaProducerVariables;

  @LogChannel(COMMUNICATION_CHANNEL)
  declare readonly communicationLog: LogChannel;

  protected async _init(): Promise<void> {
    await super._init();
    this.on('values-updated', async () => {
      await this._configureProducer();
    });
    await this._configureProducer();
  }

  protected async _start(abortSignal: AbortSignal): Promise<void> {
    await super._start(abortSignal);
    this._stopping = false;
    await this._startProducer();
  }

  protected async _stop(): Promise<void> {
    this._stopping = true;
    await this.producer?.close();
    return super._stop();
  }

  protected async _terminate(): Promise<void> {
    this._stopping = true;
    await this.producer?.close(true).catch(noOp);
  }

  protected async _configureProducer(options?: {
    serializers?: Partial<Serializers<any, any, any, any>>;
  }) {
    const isStopped = this.stopped;
    this.setStatus(ServiceStatus.starting);
    try {
      // The old client's disconnect is expected, not a failure
      this._stopping = true;
      await this.producer?.close();
      this._stopping = isStopped;
      this.producer = new Producer({
        ...options,
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
        // Producer options
        producerId: this.values.producerId,
        producerEpoch: this.values.producerEpoch,
        autocreateTopics: this.values.autocreateTopics,
        idempotent: this.values.idempotent,
        transactionalId: this.values.transactionalId,
        acks: this.values.acks
          ? this.values.acks === 'all'
            ? ProduceAcks.ALL
            : this.values.acks === 'no-response'
              ? ProduceAcks.NO_RESPONSE
              : ProduceAcks.LEADER
          : undefined,
        compression: this.values.compression,
        repeatOnStaleMetadata: this.values.repeatOnStaleMetadata,
      });

      this.producer.on('client:broker:connect', () => {
        this.setStatus(ServiceStatus.started);
        this.communicationLog?.write({
          direction: 'info',
          event: 'connect',
          message: 'Connected',
        });
        this.emit('connect');
      });
      this.producer.on('client:broker:failed', () => {
        this.setStatus(ServiceStatus.unhealthy, 'Kafka broker failed');
        this.communicationLog?.write({
          direction: 'info',
          event: 'error',
          message: 'Kafka broker failed',
        });
      });
      this.producer.on('client:broker:disconnect', () => {
        if (!this._stopping) {
          this.setStatus(
            ServiceStatus.unhealthy,
            'Kafka broker disconnected unexpectedly',
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
        await this._startProducer();
      }
    } catch (err: any) {
      this.logger?.error(err);
      this.setStatus(ServiceStatus.unhealthy, err.message);
    }
  }

  protected async _startProducer(): Promise<void> {
    /* Test connection */
    await this.producer.listApis().catch(async e => {
      this.emit('error', e);
      this.setStatus(ServiceStatus.unhealthy, e.message);
    });
  }

  async send(
    options: SendOptions<Key, Value, HeaderKey, HeaderValue> & {
      [kTransaction]?: number;
    },
  ): Promise<ProduceResult> {
    const result = await this.producer.send(options);
    for (const message of options.messages)
      this.communicationLog?.write({
        direction: 'out',
        data: messageData(message.value),
        details: messageDetails(message),
      });
    return result;
  }
}

/**
 * @namespace
 */
export namespace KafkaProducerComponent {
  export interface Events extends ComponentBase.Events {}

  export const Variables = KafkaProducerVariables;
  export type Variables = KafkaProducerVariables;
  export const SaslVariables = KafkaSaslVariables;
  export type SaslVariables = KafkaSaslVariables;
  export const TlsVariables: typeof TcpClientComponent.TlsVariables =
    TcpClientComponent.TlsVariables;
  export type TlsVariables = TcpClientComponent.TlsVariables;
}
