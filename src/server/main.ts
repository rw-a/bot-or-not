import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, 
  RoomData, PUBLIC_USER_DATA, GameState, PublicUserData } from "./types";
import { WS_PORT } from "../config";
import { generateID, createUser } from "./utility";


/* Setup Server */
dotenv.config();

const app = express();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`
  }
});
io.listen(WS_PORT);

const DATABASE: {[key:string]: RoomData} = {};


function syncGameState(roomID: string) {
  const gameState: GameState = [];
  for (const userData of Object.values(DATABASE[roomID])) {
    const publicUserData = {} as PublicUserData;
    for (const userProperty of PUBLIC_USER_DATA) {
      // @ts-ignore Typescript goes crazy because we are constructing PublicUserData from nothing
      publicUserData[userProperty] = userData[userProperty];
    }
    gameState.push(publicUserData);
  }
  io.to(roomID).emit("syncGameState", gameState);
}


/* Socket Handling */
io.on("connect", (socket) => {
  socket.on("generateRoomID", (callback: (roomID: string) => void) => {
    // Generate roomID until an unonccupied one is found
    let roomID: string;
    do {
      roomID = generateID(6).toUpperCase();
    } while (DATABASE.hasOwnProperty(roomID));

    callback(roomID);
  });

  socket.on("createRoom", (roomID: string, userID: string, username: string) => {
    if (DATABASE.hasOwnProperty(roomID)) {
      // This shouldn't happen since room code is checked on generation
      socket.emit("loginError", "Room already exists.");
      return;
    }

    DATABASE[roomID] = {[userID]: createUser(username)};

    socket.join(roomID);
    socket.emit("loginSuccess");
    syncGameState(roomID);
  });

  socket.on("joinRoom", (roomID: string, userID: string, username: string) => {
    if (!DATABASE.hasOwnProperty(roomID)) {
      socket.emit("loginError", "Room doesn't exist.");
      return;
    }

    const roomData = DATABASE[roomID];
    roomData[userID] = createUser(username);

    socket.join(roomID);
    socket.emit("loginSuccess");
    syncGameState(roomID);
  });

  socket.on("toggleReady", (roomID: string, userID: string) => {
    if (DATABASE.hasOwnProperty(roomID) && DATABASE[roomID].hasOwnProperty(userID)) {
      DATABASE[roomID][userID].ready = !DATABASE[roomID][userID].ready;
      syncGameState(roomID);
    }
  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});