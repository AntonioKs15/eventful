import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { buildPaginationMeta, PaginatedResult } from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationNotFoundException } from './exceptions/notification-not-found.exception';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Generic, fan-in notification sink: any module can call `create`/`createMany`
 * without knowing anything about notifications beyond this shape. New notification
 * types are just new string values passed in by callers, not schema changes here.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationsService.name);
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    try {
      return await this.prisma.notification.create({ data: input });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create notification');
      throw error;
    } finally {
      this.logger.debug('Notification creation completed');
    }
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    try {
      await this.prisma.notification.createMany({ data: inputs });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create notifications batch');
      throw error;
    } finally {
      this.logger.debug('Notification batch creation completed');
    }
  }

  async listMine(
    userId: string,
    page: number,
    pageSize: number,
    unreadOnly?: boolean,
  ): Promise<PaginatedResult<Notification>> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.notification.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta(page, pageSize, total) };
    } catch (error) {
      this.logger.error(
        { err: error },
        "Failed to list customer's notifications",
      );
      throw error;
    } finally {
      this.logger.debug('Notification listing completed');
    }
  }

  async countUnread(userId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: { userId, readAt: null },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to count unread notifications');
      throw error;
    } finally {
      this.logger.debug('Unread notification count completed');
    }
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.findOwnedOrThrow(userId, notificationId);

    if (notification.readAt) {
      return notification;
    }

    try {
      return await this.prisma.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to mark notification as read');
      throw error;
    } finally {
      this.logger.debug('Mark notification read completed');
    }
  }

  async markAllRead(userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to mark all notifications as read',
      );
      throw error;
    } finally {
      this.logger.debug('Mark all notifications read completed');
    }
  }

  private async findOwnedOrThrow(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    let notification: Notification | null;

    try {
      notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up notification');
      throw error;
    } finally {
      this.logger.debug('Notification lookup completed');
    }

    if (!notification || notification.userId !== userId) {
      throw new NotificationNotFoundException();
    }

    return notification;
  }
}
