import { App, AppBase, DashboardBase, UseDashboard } from '@syncbridge/common';
import { RedisStandaloneComponent } from '@syncbridge/redis';

/** Keeps its state in Redis, the connection shown */
@App({ displayName: 'Cache' })
export class CacheApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly redis: RedisStandaloneComponent;

  @UseDashboard({ title: 'Redis', include: [{ component: 'redis' }] })
  declare readonly redisTab: DashboardBase;
}
