import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/iot',
})
export class IotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IotGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(private eventEmitter: EventEmitter2) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for sensor data updates
    this.eventEmitter.on('sensor.reading.created', (data: any) => {
      this.server.to(`farm:${data.farmId}`).emit('sensor-reading', data);
    });

    // Listen for device status updates
    this.eventEmitter.on('device.status.updated', (data: any) => {
      this.server.to(`farm:${data.farmId}`).emit('device-status', data);
    });

    // Listen for device alerts
    this.eventEmitter.on('device.alert', (data: any) => {
      this.server.to(`farm:${data.farmId}`).emit('device-alert', data);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-farm')
  handleJoinFarm(
    @MessageBody() data: { farmId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `farm:${data.farmId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined farm room: ${room}`);
    
    client.emit('joined-farm', { farmId: data.farmId });
  }

  @SubscribeMessage('leave-farm')
  handleLeaveFarm(
    @MessageBody() data: { farmId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `farm:${data.farmId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left farm room: ${room}`);
    
    client.emit('left-farm', { farmId: data.farmId });
  }

  @SubscribeMessage('request-sensor-data')
  handleRequestSensorData(
    @MessageBody() data: { deviceId: string; sensorType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Emit event to request sensor data
    this.eventEmitter.emit('request.sensor.data', {
      deviceId: data.deviceId,
      sensorType: data.sensorType,
      clientId: client.id,
    });
  }

  @SubscribeMessage('device-command')
  handleDeviceCommand(
    @MessageBody() data: { deviceId: string; command: string; parameters?: any },
    @ConnectedSocket() client: Socket,
  ) {
    // Emit event to send device command
    this.eventEmitter.emit('send.device.command', {
      deviceId: data.deviceId,
      command: data.command,
      parameters: data.parameters,
      clientId: client.id,
    });
  }

  // Broadcast methods for real-time updates
  broadcastSensorReading(farmId: string, reading: any) {
    this.server.to(`farm:${farmId}`).emit('sensor-reading', reading);
  }

  broadcastDeviceStatus(farmId: string, status: any) {
    this.server.to(`farm:${farmId}`).emit('device-status', status);
  }

  broadcastDeviceAlert(farmId: string, alert: any) {
    this.server.to(`farm:${farmId}`).emit('device-alert', alert);
  }

  broadcastMqttStatus(status: any) {
    this.server.emit('mqtt-status', status);
  }
}
