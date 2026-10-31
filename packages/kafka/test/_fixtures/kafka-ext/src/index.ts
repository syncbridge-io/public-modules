import { App, AppBase, DashboardBase, UseDashboard } from '@syncbridge/common';
import {
  KafkaConsumerComponent,
  KafkaProducerComponent,
} from '@syncbridge/kafka';

/** Reads orders and writes what it makes of them: a tab for each client */
@App({ displayName: 'Orders' })
export class OrdersApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly consumer: KafkaConsumerComponent;

  @App.UseComponent({ required: true })
  declare readonly producer: KafkaProducerComponent;

  @UseDashboard({ title: 'Orders in', include: [{ component: 'consumer' }] })
  declare readonly ordersIn: DashboardBase;

  @UseDashboard({ title: 'Orders out', include: [{ component: 'producer' }] })
  declare readonly ordersOut: DashboardBase;
}
