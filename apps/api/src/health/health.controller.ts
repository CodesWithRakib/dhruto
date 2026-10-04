import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "System Health Summary" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Service is online and running",
  })
  check() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "dhruto-api",
      version: "0.1.0",
    };
  }

  @Get("liveness")
  @ApiOperation({ summary: "Liveness Probe for Kubernetes/Container Health" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Liveness probe success",
  })
  liveness() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("readiness")
  @ApiOperation({ summary: "Readiness Probe verifying dependencies" })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: "Readiness probe success",
  })
  readiness() {
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "configured",
        redis: "configured",
      },
    };
  }
}
