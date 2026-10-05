import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { TelemetryService } from "../common/interceptors/telemetry.interceptor.js";

@Module({
  controllers: [HealthController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class HealthModule {}
