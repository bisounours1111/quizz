import socketIO from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

export const socket = socketIO(SOCKET_URL);

export default socket;
