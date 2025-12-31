import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface DeviceAck {
  deviceId: string;
  action: string;
  status: 'success' | 'failed';
  timestamp: Date;
  message?: string;
}

/**
 * Service to track and wait for device acknowledgments (ACK)
 * from MQTT status messages
 */
@Injectable()
export class AckTrackerService extends EventEmitter {
  private readonly logger = new Logger(AckTrackerService.name);
  
  // Map to store pending ACK requests: deviceId -> Promise resolver
  private pendingAcks = new Map<string, {
    resolve: (ack: DeviceAck) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  /**
   * Wait for ACK from device with timeout
   * @param deviceId Device serial number
   * @param expectedAction Expected action (e.g., 'pump_on', 'pump_off')
   * @param timeoutMs Timeout in milliseconds (default: 6000ms)
   * @returns Promise that resolves with ACK or rejects on timeout
   */
  async waitForAck(
    deviceId: string,
    expectedAction: string,
    timeoutMs: number = 6000,
  ): Promise<DeviceAck> {
    return new Promise((resolve, reject) => {
      const key = `${deviceId}:${expectedAction}`;
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error(`Timeout waiting for ACK from device ${deviceId} for action ${expectedAction}`));
      }, timeoutMs);

      // Store resolver
      this.pendingAcks.set(key, { resolve, reject, timeout });
      
      this.logger.debug(`Waiting for ACK: ${key} (timeout: ${timeoutMs}ms)`);
    });
  }

  /**
   * Called when ACK is received from device
   * @param ack Device acknowledgment
   */
  // mqtt.service gọi
  receiveAck(ack: DeviceAck): void {
    const key = `${ack.deviceId}:${ack.action}`;
    const pending = this.pendingAcks.get(key);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(key);
      pending.resolve(ack);
      this.logger.debug(`ACK received: ${key} - ${ack.status}`);
    } else {
      this.logger.warn(`Received unexpected ACK: ${key}`);
    }
  }

  /**
   * Cancel waiting for ACK (cleanup)
   */
  cancelAck(deviceId: string, action: string): void {
    const key = `${deviceId}:${action}`;
    const pending = this.pendingAcks.get(key);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingAcks.delete(key);
      this.logger.debug(`ACK cancelled: ${key}`);
    }
  }

  /**
   * Get count of pending ACKs (for monitoring)
   */
  getPendingCount(): number {
    return this.pendingAcks.size;
  }
}
