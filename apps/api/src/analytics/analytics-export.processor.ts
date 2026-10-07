import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { AnalyticsExportService } from "./analytics-export.service.js";
import { getErrorMessage } from "../common/utils/error.util.js";

/** Background report generation: idempotent per export id (retries safe). */
@Processor("analytics-exports")
export class AnalyticsExportProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsExportProcessor.name);

  constructor(private readonly exports: AnalyticsExportService) {
    super();
  }

  async process(job: Job<{ exportId: string }>): Promise<void> {
    const { exportId } = job.data;
    this.logger.log(`EXPORT_GENERATE id=${exportId} job=${job.id}`);
    await this.exports.generateQueued(exportId);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<{ exportId: string }> | undefined, error: Error): void {
    this.logger.warn(
      `EXPORT_FAILED job=${job?.id} export=${job?.data?.exportId} error=${getErrorMessage(error, "unknown")}`,
    );
  }
}
