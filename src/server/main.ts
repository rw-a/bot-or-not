import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import session, { Session } from "express-session";
import dotenv from "dotenv";

import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, 
  RoomData, PUBLIC_USER_DATA, GameState, PublicUserData, UserData, GamePhases, SessionProperties } from "./types";
import { WS_PORT, WRITING_PHASE_DURATION, VOTING_PHASE_DURATION, POINTS_PER_VOTE, PHASE_END_LEEWAY_DURATION, NUMBER_ROUNDS_PER_GAME } from "../config";
import { generateID, createUser, getPrompt, saveSession } from "./utility";


/* Setup Server */
dotenv.config();

const app = express();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`,
    credentials: true
  }
});
io.listen(WS_PORT);

const sessionMiddleware = session({
  secret: "fngbdjfhglerftertwr",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 10 * 60 * 1000  // in ms
  }
});
io.engine.use(sessionMiddleware);

const DATABASE: {[key:string]: RoomData} = {};


/* Helper Functions */
function userAlreadyExists(roomID: string, username: string) {
  for (const user of Object.values(DATABASE[roomID].users)) {
    if (user.username === username) {
      return true;
    }
  }
  return false;
}

function syncGameState(roomID: string) {
  const gameState = {} as GameState;
  for (const [key, value] of Object.entries(DATABASE[roomID])) {
    if (key == "users") {
      const users: {[key: string]: PublicUserData} = {};

      for (const [userID, userData] of Object.entries(value as {[key: string]: UserData})) {
        const publicUserData = {} as PublicUserData;
        for (const userProperty of PUBLIC_USER_DATA) {
          // @ts-ignore Typescript goes crazy because we are constructing PublicUserData from nothing
          publicUserData[userProperty] = userData[userProperty];
        }
        // users[publicUserData.username.slice(4)] = publicUserData;
        // WARNING: Currently sending full userIDs to each player. Players can spoof each other using this.
        users[userID] = publicUserData;
      }
      
      gameState.users = users;

    } else {
      // @ts-ignore
      gameState[key as keyof RoomData] = value;
    }
  }

  io.to(roomID).emit("syncGameState", gameState);
}

function allPlayersReady(roomID: string) {
  for (const user of Object.values(DATABASE[roomID].users)) {
    if (!user.ready) {
      return false;
    }
  }
  return true;
}

function startWritingPhase(roomID: string) {
  const roomData = DATABASE[roomID];
  roomData.gamePhase = GamePhases.Writing;
  roomData.timerStartTime = new Date();
  roomData.prompt = getPrompt();
  syncGameState(roomID);

  setTimeout(() => {    
    // Once writing phase finishes
    startVotingPhase(roomID);
  }, (WRITING_PHASE_DURATION + PHASE_END_LEEWAY_DURATION) * 1000);

  /* TODO
  Rather than adding a leeway, automatically move on once all users have sent their request
  */
}

function startVotingPhase(roomID: string) {
  const room = DATABASE[roomID];
  room.gamePhase = GamePhases.Voting;
  room.timerStartTime = new Date();
  syncGameState(roomID);

  setTimeout(() => {
    if (room.round < NUMBER_ROUNDS_PER_GAME) {
      room.round += 1;
      startWritingPhase(roomID);
    } else {
      endGame(roomID);
    }
  }, (VOTING_PHASE_DURATION + PHASE_END_LEEWAY_DURATION) * 1000);
}

function endGame(roomID: string) {
  DATABASE[roomID].gamePhase = GamePhases.End;
  syncGameState(roomID);
}


/* Socket Handling */
io.on("connect", (socket) => {
  const req = socket.request;

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
    } else {
      // Create room with initial game state
      DATABASE[roomID] = {
        gamePhase: GamePhases.Lobby, 
        timerStartTime: new Date(), 
        users: {}, 
        round: 1
      };
    }

    DATABASE[roomID].users = {[userID]: createUser(username)};
    saveSession(req, roomID, userID);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("joinRoom", (roomID: string, userID: string, username: string) => {
    if (!DATABASE.hasOwnProperty(roomID)) {
      socket.emit("loginError", "Room doesn't exist.");
      return;
    }

    if (DATABASE[roomID].gamePhase !== GamePhases.Lobby) {
      socket.emit("loginError", "This room has already started.");
      return;
    }

    username = username.trim();

    if (userAlreadyExists(roomID, username)) {
      socket.emit("loginError", "Username already taken.");
      return;
    }

    DATABASE[roomID].users[userID] = createUser(username);
    saveSession(req, roomID, userID);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("toggleReady", () => {
    const roomID = req.session.roomID;
    const userID = req.session.userID;

    if (!DATABASE.hasOwnProperty(roomID)) return;
    const roomData = DATABASE[roomID];

    if (!roomData.users.hasOwnProperty(userID)) return;
    const userData = roomData.users[userID];

    userData.ready = !userData.ready;
    
    // If all players are now ready, start writing phase
    if (userData.ready && Object.keys(roomData.users).length >= 2 && allPlayersReady(roomID)) {
      startWritingPhase(roomID);
    } else {
      syncGameState(roomID);
    }
  });

  socket.on("submitAnswer", (answer: string) => {
    const roomID = req.session.roomID;
    const userID = req.session.userID;
    const roomData = DATABASE[roomID];

    if (roomData.gamePhase !== GamePhases.Writing) return;
    roomData.users[userID].answer = answer;
  }); 

  socket.on("submitVote", (votedUserID: string) => {
    /* TODO
    this doesn't consider the fact that you can vote for the AI
    May need to change index into first 10 characters of userID
    */
    const roomID = req.session.roomID;
    const userID = req.session.userID;
    const roomData = DATABASE[roomID];

    if (roomData.gamePhase !== GamePhases.Voting) return;
    if (!roomData.users.hasOwnProperty(votedUserID)) return;
    if (votedUserID === userID) return;

    const votedUser = roomData.users[votedUserID];
    votedUser.points += POINTS_PER_VOTE;
    roomData.users[userID].vote = votedUser.username;
  }); 

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});

declare module "http" {
  interface IncomingMessage {
      session: Session & SessionProperties
  }
}

ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});