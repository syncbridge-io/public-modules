import { App, AppBase, DashboardBase, UseDashboard } from '@syncbridge/common';
import { SqbClientComponent } from '@syncbridge/sqb';

/** Keeps its records in a database, the client's widgets shown */
@App({ displayName: 'Records' })
export class RecordsApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly db: SqbClientComponent;

  @UseDashboard({ title: 'Database', include: [{ component: 'db' }] })
  declare readonly databaseTab: DashboardBase;
}
