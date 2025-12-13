import { socket } from "@utils";

socket.start(Number(process.env.SOCKET_PORT ?? 4500));