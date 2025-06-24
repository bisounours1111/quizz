import socketIO from "socket.io-client";

const SOCKET_URL = "http://89.157.254.92:3001";

export const socket = socketIO(SOCKET_URL);

export default socket;
