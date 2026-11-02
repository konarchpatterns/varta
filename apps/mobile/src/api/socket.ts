import { io, Socket } from 'socket.io-client';
import { getAuthToken, getWsBaseUrl } from '../api/client';

let socket: Socket | null = null;

/**
 * One shared Socket.io connection for the whole app, exactly like the web
 * client (apps/web/src/lib/socket.ts). The gateway authenticates with
 * `handshake.auth.token`, so the access token must be current: call
 * `reconnectSocket()` after login / token refresh.
 */
export function getSocket(): Socket {
  const token = getAuthToken();
  const url = getWsBaseUrl();

  if (!socket) {
    socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  }

  return socket;
}

export function reconnectSocket() {
  if (socket) {
    socket.auth = { token: getAuthToken() };
    socket.disconnect();
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
}
