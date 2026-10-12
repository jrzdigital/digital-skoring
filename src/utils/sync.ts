import { SyncPacket } from '../types/scoring';

const SYNC_CHANNEL_NAME = 'silatscore_ipsi_2026_channel';
const STORAGE_BACKUP_KEY = 'silatscore_sync_packet_v2026';

type SyncListener = (packet: SyncPacket) => void;

class RealtimeSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
  private clientId: string = '';

  constructor() {
    this.clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncPacket>) => {
          this.handleIncoming(event.data);
        };
      } catch {
        // Fallback to storage event
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === STORAGE_BACKUP_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as SyncPacket;
            this.handleIncoming(parsed);
          } catch {
            // ignore malformed
          }
        }
      });
    }
  }

  private handleIncoming(packet: SyncPacket) {
    if (!packet || packet.sender === this.clientId) return;
    this.listeners.forEach((listener) => {
      try {
        listener(packet);
      } catch (err) {
        console.error('Error in sync listener', err);
      }
    });
  }

  public broadcast(packet: Omit<SyncPacket, 'sender' | 'timestamp' | 'version'>) {
    const fullPacket: SyncPacket = {
      ...packet,
      version: '2026.1',
      sender: this.clientId,
      timestamp: Date.now(),
    };

    // Broadcast channel
    if (this.channel) {
      try {
        this.channel.postMessage(fullPacket);
      } catch {
        // ignore
      }
    }

    // LocalStorage fallback for tabs
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(fullPacket));
      } catch {
        // ignore storage quota
      }
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getClientId(): string {
    return this.clientId;
  }
}

export const syncManager = new RealtimeSyncManager();
