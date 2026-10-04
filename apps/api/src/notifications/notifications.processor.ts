import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { type CreateNotificationDto } from "@dhruto/contracts";

@Processor("notifications")
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<CreateNotificationDto>): Promise<any> {
    this.logger.log(`Processing background notification job ${job.id} [${job.name}]`);
    return this.notificationsService.createNotification(job.data);
  }
}
