import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import {
  TransactionStatus,
  FlowDirection,
  SettlementTrigger,
} from '../common/enums';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export interface NotificationPayload {
  type: string;
  message: string;
  data?: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
@Injectable()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.userId;
      client.userId = payload.sub;

      // Track user connections
      if (client.userId) {
        const existingSockets = this.userSockets.get(client.userId) || [];
        existingSockets.push(client.id);
        this.userSockets.set(client.userId, existingSockets);

        // Join user-specific room
        client.join(`user:${client.userId}`);
      }

      this.logger.log(
        `Client connected: ${client.id} (User: ${client.userId})`,
      );

      // Send welcome notification
      this.sendToClient(client.id, {
        type: 'connection',
        message: 'Connected to EnerLink notifications',
        timestamp: new Date().toISOString(),
        priority: 'low',
      });
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const existingSockets = this.userSockets.get(client.userId) || [];
      const updatedSockets = existingSockets.filter((id) => id !== client.id);

      if (updatedSockets.length > 0) {
        this.userSockets.set(client.userId, updatedSockets);
      } else {
        this.userSockets.delete(client.userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    const { channels } = data;

    channels.forEach((channel) => {
      if (client.userId && this.isValidChannel(channel, client.userId)) {
        client.join(channel);
        this.logger.log(`Client ${client.id} subscribed to ${channel}`);
      }
    });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channels: string[] },
  ) {
    const { channels } = data;

    channels.forEach((channel) => {
      client.leave(channel);
      this.logger.log(`Client ${client.id} unsubscribed from ${channel}`);
    });
  }

  // Energy Settlement Notifications
  notifySettlementStarted(
    meterId: string,
    userId: string,
    trigger: SettlementTrigger,
  ) {
    this.sendToUser(userId, {
      type: 'settlement_started',
      message: `Energy settlement started for device ${meterId}`,
      data: { meterId, trigger },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifySettlementCompleted(
    meterId: string,
    userId: string,
    txHash: string,
    netEnergyKwh: number,
  ) {
    this.sendToUser(userId, {
      type: 'settlement_completed',
      message: `Energy settlement completed for device ${meterId}`,
      data: { meterId, txHash, netEnergyKwh },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifySettlementFailed(meterId: string, userId: string, error: string) {
    this.sendToUser(userId, {
      type: 'settlement_failed',
      message: `Energy settlement failed for device ${meterId}: ${error}`,
      data: { meterId, error },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  // Device Status Notifications
  notifyDeviceOffline(meterId: string, userId: string, lastSeen: string) {
    this.sendToUser(userId, {
      type: 'device_offline',
      message: `Device ${meterId} is offline`,
      data: { meterId, lastSeen },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  notifyDeviceOnline(meterId: string, userId: string) {
    this.sendToUser(userId, {
      type: 'device_online',
      message: `Device ${meterId} is back online`,
      data: { meterId },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifyDeviceAlert(
    meterId: string,
    userId: string,
    alertType: string,
    message: string,
  ) {
    this.sendToUser(userId, {
      type: 'device_alert',
      message: `Device Alert: ${message}`,
      data: { meterId, alertType },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  // Trading Notifications
  notifyOrderPlaced(
    orderId: string,
    userId: string,
    orderType: string,
    quantity: number,
    price: number,
  ) {
    this.sendToUser(userId, {
      type: 'order_placed',
      message: `${orderType} order placed: ${quantity} ETK at ${price} IDRS`,
      data: { orderId, orderType, quantity, price },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifyOrderMatched(
    orderId: string,
    userId: string,
    quantity: number,
    price: number,
  ) {
    this.sendToUser(userId, {
      type: 'order_matched',
      message: `Order matched: ${quantity} ETK at ${price} IDRS`,
      data: { orderId, quantity, price },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifyOrderCancelled(orderId: string, userId: string) {
    this.sendToUser(userId, {
      type: 'order_cancelled',
      message: `Order ${orderId} has been cancelled`,
      data: { orderId },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });
  }

  // Blockchain Transaction Notifications
  notifyTransactionSuccess(txHash: string, userId: string, type: string) {
    this.sendToUser(userId, {
      type: 'transaction_success',
      message: `Transaction confirmed: ${type}`,
      data: { txHash, transactionType: type },
      timestamp: new Date().toISOString(),
      priority: 'medium',
    });
  }

  notifyTransactionFailed(
    txHash: string,
    userId: string,
    type: string,
    error: string,
  ) {
    this.sendToUser(userId, {
      type: 'transaction_failed',
      message: `Transaction failed: ${type} - ${error}`,
      data: { txHash, transactionType: type, error },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  // Command Acknowledgment Notifications
  notifyCommandAcknowledged(
    meterId: string,
    userId: string,
    commandType: string,
    correlationId: string,
  ) {
    this.sendToUser(userId, {
      type: 'command_acknowledged',
      message: `Device command acknowledged: ${commandType}`,
      data: { meterId, commandType, correlationId },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });
  }

  notifyCommandTimeout(
    meterId: string,
    userId: string,
    commandType: string,
    correlationId: string,
  ) {
    this.sendToUser(userId, {
      type: 'command_timeout',
      message: `Device command timed out: ${commandType}`,
      data: { meterId, commandType, correlationId },
      timestamp: new Date().toISOString(),
      priority: 'high',
    });
  }

  // Energy Data Updates
  notifyEnergyDataUpdate(meterId: string, userId: string, data: any) {
    this.sendToChannel(`device:${meterId}`, {
      type: 'energy_data_update',
      message: 'New energy data available',
      data: { meterId, ...data },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });

    this.sendToUser(userId, {
      type: 'energy_data_update',
      message: `Energy data updated for device ${meterId}`,
      data: { meterId, ...data },
      timestamp: new Date().toISOString(),
      priority: 'low',
    });
  }

  // Utility methods
  private sendToUser(userId: string, notification: NotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  private sendToChannel(channel: string, notification: NotificationPayload) {
    this.server.to(channel).emit('notification', notification);
  }

  private sendToClient(clientId: string, notification: NotificationPayload) {
    this.server.to(clientId).emit('notification', notification);
  }

  private isValidChannel(channel: string, userId: string): boolean {
    // Allow users to subscribe to their own channels and public channels
    const allowedPatterns = [
      `user:${userId}`,
      `device:`, // Will be validated further based on device ownership
      'market:trades',
      'market:orders',
      'system:announcements',
    ];

    return allowedPatterns.some((pattern) => channel.startsWith(pattern));
  }

  // Public broadcast methods for system-wide notifications
  broadcastSystemMessage(
    message: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ) {
    this.server.emit('notification', {
      type: 'system_message',
      message,
      timestamp: new Date().toISOString(),
      priority,
    });
  }

  broadcastMarketUpdate(data: any) {
    this.sendToChannel('market:trades', {
      type: 'market_update',
      message: 'Market data updated',
      data,
      timestamp: new Date().toISOString(),
      priority: 'low',
    });
  }
}
