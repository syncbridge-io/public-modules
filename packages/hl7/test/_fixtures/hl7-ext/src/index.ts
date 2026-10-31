import { App, AppBase, DashboardBase, UseDashboard } from '@syncbridge/common';
import { HL7ServerComponent } from '@syncbridge/hl7';

/** Acknowledges what it receives, rejecting an ADT: one of each answer */
@App({ displayName: 'HL7 Receiver' })
export class HL7ReceiverApp extends AppBase {
  @App.UseComponent({ required: true })
  declare readonly receiver: HL7ServerComponent;

  @UseDashboard({ title: 'Messages', include: [{ component: 'receiver' }] })
  declare readonly messages: DashboardBase;

  protected async _init(): Promise<void> {
    await super._init();
    this.receiver.use((req, res) => {
      res.message = req.message.createAck(
        req.message.messageType.startsWith('ADT') ? 'AR' : 'AA',
      );
    });
  }
}
