import {
  Controller,
  Post,
  Get,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./services/auth.service.js";
import { RegisterDto, LoginDto, RefreshTokenDto } from "./dto/auth.dto.js";
import { Public } from "./decorators/public.decorator.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { type AuthenticatedUser } from "./jwt/jwt.interface.js";
import { type RequestWithId } from "../common/middleware/request-id.middleware.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new user account (Merchant, Rider, etc.)",
    description: "Creates user credentials, sets password hash, and creates associated entity.",
  })
  async register(@Body() dto: RegisterDto, @Req() req: RequestWithId) {
    const result = await this.authService.register(dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: "Account registered successfully",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Authenticate user and issue JWT tokens",
    description: "Validates email/phone and password, returning short-lived access token and refresh token.",
  })
  async login(@Body() dto: LoginDto, @Req() req: RequestWithId) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Authentication successful",
      data: result,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh access token using a refresh token",
  })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: RequestWithId) {
    const tokens = await this.authService.refresh(dto.refreshToken);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Token refreshed successfully",
      data: tokens,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Log out user session",
  })
  async logout(@Req() req: RequestWithId) {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "Logged out successfully",
      data: null,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get current authenticated user profile and roles",
  })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: RequestWithId,
  ) {
    const profile = await this.authService.getProfile(user.id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: "User profile retrieved successfully",
      data: profile,
      meta: {
        requestId: req.requestId || "unknown",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
