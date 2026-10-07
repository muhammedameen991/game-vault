import { MultiplayerRoom } from '../types';

export type PacketType =
  | 'JOIN'
  | 'LEAVE'
  | 'READY'
  | 'START'
  | 'INPUT'
  | 'STATE'
  | 'EVENT'
  | 'SCORE'
  | 'GAME_OVER'
  | 'PING'
  | 'PONG';

export interface NetworkPacket {
  type: PacketType;
  senderId: string;
  timestamp: number;
  data?: any;
}

export interface PeerConnectionInfo {
  peerId: string;
  name: string;
  connection: RTCPeerConnection | null;
  channel: RTCDataChannel | null;
  state: 'connecting' | 'connected' | 'disconnected';
  latency: number;
  lastPing: number;
}

class MultiplayerManager {
  private localPlayerId: string;
  private localPlayerName: string = 'Ameen';
  private currentRoom: MultiplayerRoom | null = null;
  private isHost: boolean = false;

  private peers: Map<string, PeerConnectionInfo> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private messageHandlers: Set<(packet: NetworkPacket) => void> = new Set();
  private roomUpdateHandlers: Set<(room: MultiplayerRoom) => void> = new Set();

  public metrics = {
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    lastLatencyMs: 24,
    connectionState: 'idle' as 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  };

  private pingInterval: any = null;

  constructor() {
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('gamevault_p2p_mesh');
      this.broadcastChannel.onmessage = (event) => {
        this.handleInboundData(event.data);
      };
    }
  }

  public setPlayerName(name: string) {
    this.localPlayerName = name;
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  public getPlayerName(): string {
    return this.localPlayerName;
  }

  public isUserHost(): boolean {
    return this.isHost;
  }

  public getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom;
  }

  public async createRoom(gameId: string, maxPlayers = 4): Promise<MultiplayerRoom> {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.isHost = true;
    this.peers.clear();
    this.metrics.connectionState = 'connected';

    this.currentRoom = {
      code,
      gameId,
      hostId: this.localPlayerId,
      hostName: this.localPlayerName,
      maxPlayers,
      players: [
        {
          id: this.localPlayerId,
          name: this.localPlayerName,
          ready: true,
          isHost: true,
          ping: 0
        }
      ],
      state: 'waiting'
    };

    this.startHeartbeat();
    this.notifyRoomUpdate();

    this.broadcast({
      type: 'EVENT',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: { event: 'ROOM_CREATED', room: this.currentRoom }
    });

    return this.currentRoom;
  }

  public async joinRoom(roomCode: string, gameId = 'neon-racer'): Promise<MultiplayerRoom> {
    this.isHost = false;
    this.metrics.connectionState = 'connecting';

    this.currentRoom = {
      code: roomCode.toUpperCase(),
      gameId,
      hostId: 'host_peer',
      hostName: 'Host Player',
      maxPlayers: 4,
      players: [
        { id: 'host_peer', name: 'Host Player', ready: true, isHost: true, ping: 25 },
        { id: this.localPlayerId, name: this.localPlayerName, ready: true, isHost: false, ping: 25 }
      ],
      state: 'waiting'
    };

    this.broadcast({
      type: 'JOIN',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: { name: this.localPlayerName }
    });

    this.metrics.connectionState = 'connected';
    this.startHeartbeat();
    this.notifyRoomUpdate();

    return this.currentRoom;
  }

  public toggleReady(): boolean {
    if (!this.currentRoom) return false;
    const player = this.currentRoom.players.find((p) => p.id === this.localPlayerId);
    if (player) {
      player.ready = !player.ready;
      this.broadcast({
        type: 'READY',
        senderId: this.localPlayerId,
        timestamp: Date.now(),
        data: { ready: player.ready }
      });
      this.notifyRoomUpdate();
      return player.ready;
    }
    return false;
  }

  public startGame() {
    if (!this.isHost || !this.currentRoom) return;
    this.currentRoom.state = 'playing';
    this.broadcast({
      type: 'START',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: { gameId: this.currentRoom.gameId }
    });
    this.notifyRoomUpdate();
  }

  public disconnect() {
    if (this.currentRoom) {
      this.broadcast({
        type: 'LEAVE',
        senderId: this.localPlayerId,
        timestamp: Date.now()
      });
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.peers.forEach((peer) => {
      peer.channel?.close();
      peer.connection?.close();
    });
    this.peers.clear();
    this.currentRoom = null;
    this.isHost = false;
    this.metrics.connectionState = 'disconnected';
  }

  public async generateOfferSignal(): Promise<string> {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      const channel = pc.createDataChannel('gamevault-channel', { ordered: false });
      this.setupDataChannel(channel, 'guest');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const signalData = {
        type: 'offer',
        sdp: offer.sdp,
        room: this.currentRoom?.code
      };
      return btoa(JSON.stringify(signalData));
    } catch (e) {
      return btoa(JSON.stringify({ room: this.currentRoom?.code, hostId: this.localPlayerId }));
    }
  }

  public async acceptSignal(encodedData: string): Promise<string> {
    try {
      const signal = JSON.parse(atob(encodedData));
      if (signal.type === 'offer') {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pc.ondatachannel = (e) => {
          this.setupDataChannel(e.channel, 'host');
        };
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        return btoa(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  private setupDataChannel(channel: RTCDataChannel, _peerId: string) {
    channel.onopen = () => {
      this.metrics.connectionState = 'connected';
    };
    channel.onclose = () => {
      this.metrics.connectionState = 'disconnected';
    };
    channel.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        this.handleInboundData(packet);
      } catch (e) {}
    };
  }

  public send(targetPlayerId: string, packet: NetworkPacket) {
    this.transmitPacket(packet, targetPlayerId);
  }

  public broadcast(packet: NetworkPacket) {
    this.transmitPacket(packet);
  }

  private transmitPacket(packet: NetworkPacket, targetId?: string) {
    const raw = JSON.stringify(packet);
    this.metrics.packetsSent += 1;
    this.metrics.bytesSent += raw.length;

    try {
      this.broadcastChannel?.postMessage(packet);
    } catch (e) {}

    this.peers.forEach((peer, id) => {
      if (!targetId || targetId === id) {
        if (peer.channel && peer.channel.readyState === 'open') {
          peer.channel.send(raw);
        }
      }
    });
  }

  private handleInboundData(packet: NetworkPacket) {
    if (!packet || packet.senderId === this.localPlayerId) return;

    this.metrics.packetsReceived += 1;
    this.metrics.bytesReceived += JSON.stringify(packet).length;

    if (packet.type === 'PING') {
      this.send(packet.senderId, {
        type: 'PONG',
        senderId: this.localPlayerId,
        timestamp: packet.timestamp
      });
      return;
    }

    if (packet.type === 'PONG') {
      const rtt = Math.max(1, Date.now() - packet.timestamp);
      this.metrics.lastLatencyMs = Math.round(rtt / 2);
      if (this.currentRoom) {
        const p = this.currentRoom.players.find((pl) => pl.id === packet.senderId);
        if (p) p.ping = this.metrics.lastLatencyMs;
        this.notifyRoomUpdate();
      }
      return;
    }

    if (packet.type === 'JOIN' && this.isHost && this.currentRoom) {
      if (!this.currentRoom.players.some((p) => p.id === packet.senderId)) {
        this.currentRoom.players.push({
          id: packet.senderId,
          name: packet.data?.name || 'Guest',
          ready: false,
          isHost: false,
          ping: 28
        });
        this.notifyRoomUpdate();
        this.broadcast({
          type: 'EVENT',
          senderId: this.localPlayerId,
          timestamp: Date.now(),
          data: { event: 'ROOM_SYNC', room: this.currentRoom }
        });
      }
    }

    if (packet.type === 'EVENT' && packet.data?.event === 'ROOM_SYNC' && !this.isHost) {
      this.currentRoom = packet.data.room;
      this.notifyRoomUpdate();
    }

    if (packet.type === 'START') {
      if (this.currentRoom) {
        this.currentRoom.state = 'playing';
        this.notifyRoomUpdate();
      }
    }

    if (packet.type === 'LEAVE' && this.currentRoom) {
      this.currentRoom.players = this.currentRoom.players.filter((p) => p.id !== packet.senderId);
      this.notifyRoomUpdate();
    }

    this.messageHandlers.forEach((cb) => cb(packet));
  }

  private startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'PING',
        senderId: this.localPlayerId,
        timestamp: Date.now()
      });
    }, 2000);
  }

  public onMessage(callback: (packet: NetworkPacket) => void) {
    this.messageHandlers.add(callback);
    return () => {
      this.messageHandlers.delete(callback);
    };
  }

  public onRoomUpdate(callback: (room: MultiplayerRoom) => void) {
    this.roomUpdateHandlers.add(callback);
    return () => {
      this.roomUpdateHandlers.delete(callback);
    };
  }

  private notifyRoomUpdate() {
    if (this.currentRoom) {
      this.roomUpdateHandlers.forEach((cb) => cb({ ...this.currentRoom! }));
    }
  }

  public syncState(state: any) {
    if (!this.isHost) return;
    this.broadcast({
      type: 'STATE',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      data: state
    });
  }
}

export const multiplayer = new MultiplayerManager();
