import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { User, Merchant, Rider, Hub } from "../database/entities/index.js";
import { CustomJwtService } from "./jwt/custom-jwt.service.js";
import { PasswordService } from "./services/password.service.js";
import { AuthService } from "./services/auth.service.js";
import { AuthController } from "./auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RolesGuard } from "./guards/roles.guard.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Merchant, Rider, Hub]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    CustomJwtService,
    PasswordService,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    CustomJwtService,
    PasswordService,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
