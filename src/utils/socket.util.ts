import os from 'os'
import { Server, Socket } from "socket.io";
import { Auth, logger } from "@utils";



let io: Server | null = null;

type Handler = (client: Socket, data: any) => void;



// ===============================
// ## socket: event register handler
// ===============================
export class EventRegistry {
  private events = new Map<string, Handler[]>();
  private authEvents = new Map<string, Handler[]>();

  on(event: string, handler: Handler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  auth() {
    return {
      on: (event: string, handler: Handler) => {
        if (!this.authEvents.has(event)) {
          this.authEvents.set(event, []);
        }
        this.authEvents.get(event)!.push(handler);
      },
    };
  }


  bind(client: Socket) {
    this.events.forEach((handlers, eventName) => {
      client.on(eventName, (data) => {
        handlers.forEach((handler) => handler(client, data));
      });
    });

    this.authEvents.forEach((handlers, eventName) => {
      client.on(eventName, async (data) => {
        const token = data?.accessToken;

        const session = await Auth.verifyAccessToken(token);

        if (!session) {
          client.emit("error", {
            event: eventName,
            message: "UNAUTHORIZED_USER",
          });
          return;
        }

        client.data.user = {id: session.user.id, token: session.token};

        handlers.forEach((handler) => handler(client, data));
      });
    });
  }
}



export const socket = {
  // ===============================
  // ## socket: start server
  // ===============================
  start(port: number) {
    if (io) return io;

    io = new Server(port, {
      cors: {
        origin: process.env.SOCKET_CORS_ORIGINS || "*",
        credentials: true,
      },
      transports: ["websocket"],
    });

    io.use(async (client, next) => {
      try {
        const accessKey = client.handshake.auth?.accessKey || client.handshake.headers["x-api-key"];

        if(process.env.SOCKET_KEY) {
          if (accessKey !== process.env.SOCKET_APP_KEY) {
            return next(new Error("INVALID_SOCKET_KEY"));
          };
        }

        next();
      } catch {
        next(new Error("AUTH_ERROR"));
      }
    });

    io.on("connection", (client: Socket) => {
      logger.socket("client connected:", client.id);

      socket.event.bind(client);

      client.on("disconnect", (reason) => {
        logger.socket("client disconnected:", client.id, reason);
      });
    });

    function getLocalIP() {
      const interfaces = os.networkInterfaces()
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name] || []) {
          if (net.family === 'IPv4' && !net.internal) return net.address
        }
      }
    }
    
    setTimeout(() => logger.start(`WS Server running on \n        [LOCAL]    http://localhost:${port} \n        [NETWORK]  http://${getLocalIP()}:${port}!`), 300);
    return io;
  },


  // ===============================
  // ## socket: event register
  // ===============================
  event: new EventRegistry(),


  // ===============================
  // ## socket: emit
  // ===============================
  emit(event: string, payload?: any) {
    io?.emit(event, payload);
  },


  // ===============================
  // ## socket: emit specific client
  // ===============================
  send(client: Socket, event: string, payload?: any) {
    client.emit(event, payload);
  },


  // ===============================
  // ## socket: join room
  // ===============================
  join(client: Socket, room: string) {
    client.join(room);
  },


  // ===============================
  // ## socket: leave
  // ===============================
  leave(client: Socket, room: string) {
    client.leave(room);
  },

  // ===============================
  // ## socket: disconnect
  // ===============================
  room(room: string) {
    return {
      emit(event: string, payload?: any) {
        io?.to(room).emit(event, payload);
      },
    };
  },


  // ===============================
  // ## socket: namespace
  // ===============================
  of(namespace: string) {
    if (!io) return null;
    return io.of(namespace);
  },


  // ===============================
  // ## socket: disconnect
  // ===============================
  disconnect(client: Socket, reason?: string) {
    if (reason) {
      client.emit("force-disconnect", { reason });
    }
    client.disconnect(true);
  },


  // ===============================
  // ## socket: shutdown server
  // ===============================
  shutdown() {
    if (!io) return;
    io.close();
    io = null;
    logger.socket("WS shutdown complete");
  },
};
