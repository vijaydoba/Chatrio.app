// Live connection for an active Blind Date chat room.
import { io, Socket } from "socket.io-client";
import { BLIND_DATE_API_BASE } from "./config";

let socket: Socket | null = null;

export function connectBlindDateSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(BLIND_DATE_API_BASE, { auth: { token } });
  return socket;
}

export function disconnectBlindDateSocket() {
  socket?.disconnect();
  socket = null;
}
