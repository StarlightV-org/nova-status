import type { Server } from "socket.io";
import z from "zod";

const roomRegex = /[A-Za-z]{8}[0-9]{8}/;

export function registerAdapterHandlers(io: Server) {
  // Listen for 'join-room' event
  io.of("/").adapter.on("join-room", async (room, _id) => {
    const isRoom = z.string().regex(roomRegex).safeParse(room).success;
    if (!isRoom) return;

    const clientsInRoom = io.of("/").adapter.rooms.get(room);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;
    Print.Debug(`Client joined room ${room}. Total clients in room: ${numClients}`);
  });

  // Listen for 'leave-room' event
  io.of("/").adapter.on("leave-room", async (room, id) => {
    const isRoom = z.string().regex(roomRegex).safeParse(room).success;
    if (!isRoom) return;

    const clientsInRoom = io.of("/").adapter.rooms.get(room);
    const numClients = clientsInRoom ? clientsInRoom.size : 0;
    Print.Debug(`Client left room ${room}. Total clients in room: ${numClients}`);
  });
}
