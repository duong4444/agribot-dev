import {
  WebSocketGateway, // decorator đánh dấu class là websocket gateway
  WebSocketServer, // decorator để inject Socket.IO server instance
  OnGatewayConnection, // Interface cho lifecycle hook khi client connect
  OnGatewayDisconnect, // Interface cho lifecycle hook khi client disconnect
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

// Tạo websocket gateway để gửi real-time updates từ BE đến FE khi có sự kiện mới (irrigation, lighting, sensor data)

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/iot', // WebSocket namespace, client sẽ connect tới ws://localhost:3000/iot
})
export class IotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() // Nestjs tự inject SocketIO server vào property 'server'
  server: Server; // socket.io server instance dùng để emit events

  private readonly logger = new Logger(IotGateway.name);
  // OnGatewayConnection
  // đc gọi khi FE React component connect WS , id do SocketIO tự tạo
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
  // OnGatewayDisconnect
  // đc gọi khi User đóng browser, cpn unmount, mất mạng
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Emit methods - gửi event -> FE 

  // Emit irrigation event to all clients listening to this device
  emitIrrigationEvent(deviceId: string, event: any) {
    this.server.emit(`irrigation:${deviceId}`, event);
    this.logger.debug(`Emitted irrigation event for ${deviceId}`);
  }

  // Emit lighting event to all clients listening to this device
  emitLightingEvent(deviceId: string, event: any) {
    this.server.emit(`lighting:${deviceId}`, event);
    this.logger.debug(`Emitted lighting event for ${deviceId}`);
  }

  // Emit sensor data to all clients listening to this device
  emitSensorData(deviceId: string, data: any) {
    this.server.emit(`sensor:${deviceId}`, data);
    this.logger.debug(`Emitted sensor data for ${deviceId}`);
  }
}
