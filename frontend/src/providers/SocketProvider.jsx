import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      console.log('[Socket] Connected');
    });

    newSocket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      reconnectAttempts.current++;
      console.log('[Socket] Connection error:', error.message);
    });

    newSocket.on('new_event', (event) => {
      setLastEvent(event);
    });

    newSocket.on('new_alert', (alert) => {
      setLastEvent({ type: 'alert', data: alert });
    });

    newSocket.on('new_incident', (incident) => {
      setLastEvent({ type: 'incident', data: incident });
    });

    newSocket.on('stats_update', (stats) => {
      setLastEvent({ type: 'stats', data: stats });
    });

    setSocket(newSocket);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  const emit = useCallback((event, data) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, lastEvent, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}