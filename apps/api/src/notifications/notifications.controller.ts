import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Notification } from '@prisma/client';
import { PaginatedResult, PAGINATION_DEFAULTS } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('mine')
  @ApiOperation({
    summary: "Lists the authenticated user's notifications, newest first.",
  })
  listMine(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query('page') page = PAGINATION_DEFAULTS.PAGE,
    @Query('pageSize') pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationsService.listMine(
      user.userId,
      Number(page),
      Number(pageSize),
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: "Returns the authenticated user's unread count." })
  async countUnread(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.countUnread(user.userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marks one notification as read.' })
  markRead(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.markRead(user.userId, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Marks all of the user's notifications as read." })
  markAllRead(@CurrentUser() user: AuthenticatedRequestUser): Promise<void> {
    return this.notificationsService.markAllRead(user.userId);
  }
}
