import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import helmet from "helmet";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const apiPrefix = process.env.API_PREFIX || "/api/v1";
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5000";

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow Swagger UI inline scripts/styles
    }),
  );

  // Global Prefix (excluding root health probes for container orchestrators)
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ""), {
    exclude: ["health", "health/(.*)"],
  });

  // CORS Configuration
  app.enableCors({
    origin: corsOrigin.includes(",")
      ? corsOrigin.split(",").map((s) => s.trim())
      : corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
  });

  // Graceful Shutdown
  app.enableShutdownHooks();

  // Swagger / OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Dhruto Logistics OS — Backend API")
    .setDescription(
      "Enterprise logistics operating system for Bangladesh. Powering parcel lifecycle, hub scanning, COD reconciliation, and merchant wallets.",
    )
    .setVersion("0.1.0")
    .addTag("Health", "System health and Kubernetes liveness/readiness probes")
    .addTag("Auth", "Custom JWT Authentication, session management, and role-based access")
    .addTag("Parcels", "Parcel creation, validation, and lifecycle management")
    .addTag("Riders", "Rider delivery execution, OTP verification, and cash hand-in")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT Bearer token",
      },
      "JWT-auth",
    )
    .build();

  const openApiDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(openApiDoc), {
    customSiteTitle: "Dhruto API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`========================================================`);
  logger.log(`🚀 Dhruto API server running on: http://localhost:${port}/${apiPrefix.replace(/^\//, "")}`);
  logger.log(`📚 Interactive Swagger docs at: http://localhost:${port}/docs`);
  logger.log(`========================================================`);
}

void bootstrap();
