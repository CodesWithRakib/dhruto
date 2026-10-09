import { Global, Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { DomainEventPublisher } from "./publishers/domain-event-publisher.service.js";
import { AuditEventListener } from "./listeners/audit-event.listener.js";

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    IntegrationsModule,
  ],
  providers: [DomainEventPublisher, AuditEventListener],
  exports: [DomainEventPublisher, AuditEventListener],
})
export class EventsModule {}
