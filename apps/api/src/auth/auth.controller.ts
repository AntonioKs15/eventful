import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { authConfig } from '../config/auth.config';
import type { AuthConfig } from '../config/auth.config';
import { appConfig } from '../config/app.config';
import type { AppConfig } from '../config/app.config';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthSessionResponseDto, AuthUserDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenInvalidException } from './exceptions/refresh-token-invalid.exception';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from './security/refresh-cookie.util';
import type { AuthenticatedRequestUser } from './strategies/jwt-access.strategy';

interface RequestWithRefreshCookie extends Request {
  cookies: Partial<Record<typeof REFRESH_TOKEN_COOKIE_NAME, string>>;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    @Inject(authConfig.KEY) private readonly authConfigValue: AuthConfig,
    @Inject(appConfig.KEY) private readonly appConfigValue: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticates a user and starts a session.' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.authService.login(body.email, body.password);
    this.attachRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotates the refresh token and issues a new access token.',
  })
  async refresh(
    @Req() request: RequestWithRefreshCookie,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const rawRefreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new RefreshTokenInvalidException();
    }

    const session = await this.authService.refresh(rawRefreshToken);
    this.attachRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revokes the current refresh token and clears the session cookie.',
  })
  async logout(
    @Req() request: RequestWithRefreshCookie,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rawRefreshToken = request.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (rawRefreshToken) {
      await this.refreshTokenService.revoke(rawRefreshToken);
    }
    clearRefreshTokenCookie(response, this.appConfigValue.nodeEnv);
  }

  @Get('me')
  @ApiOperation({ summary: "Returns the authenticated user's profile." })
  me(@CurrentUser() user: AuthenticatedRequestUser): Promise<AuthUserDto> {
    return this.authService.getCurrentUser(user.userId);
  }

  private attachRefreshCookie(
    response: Response,
    rawRefreshToken: string,
  ): void {
    setRefreshTokenCookie(
      response,
      this.appConfigValue.nodeEnv,
      rawRefreshToken,
      this.authConfigValue.refreshTokenExpiresInDays,
    );
  }
}
