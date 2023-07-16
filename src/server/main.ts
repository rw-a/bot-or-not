import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import session, { Session } from "express-session";
import dotenv from "dotenv";

import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, 
  RoomData, PUBLIC_USER_DATA, GameState, PublicUserData, UserData, GamePhases, SessionProperties } from "./types";
import { WS_PORT, WRITING_PHASE_DURATION, VOTING_PHASE_DURATION, POINTS_PER_VOTE, PHASE_END_LEEWAY_DURATION, NUMBER_ROUNDS_PER_GAME } from "../config";
import { generateID, createUser, getPrompt } from "./utility";


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
/* TODO
Refactor to use express-session middleware to save userID and roomID rather than sending it each time
*/


function syncGameState(roomID: string) {
  const gameState = {} as GameState;
  for (const [key, value] of Object.entries(DATABASE[roomID])) {
    if (key == "users") {
      const users: PublicUserData[] = [];

      for (const userData of Object.values(value as {[key: string]: UserData})) {
        const publicUserData = {} as PublicUserData;
        for (const userProperty of PUBLIC_USER_DATA) {
          // @ts-ignore Typescript goes crazy because we are constructing PublicUserData from nothing
          publicUserData[userProperty] = userData[userProperty];
        }
        users.push(publicUserData);
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
  DATABASE[roomID].gamePhase = GamePhases.Writing;
  DATABASE[roomID].timerStartTime = new Date();
  DATABASE[roomID].prompt = getPrompt();
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
  DATABASE[roomID].gamePhase = GamePhases.Voting;
  DATABASE[roomID].timerStartTime = new Date();
  syncGameState(roomID);

  setTimeout(() => {
    if (DATABASE[roomID].round < NUMBER_ROUNDS_PER_GAME) {
      DATABASE[roomID].round += 1;
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

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");

    // Save the credentials to the session
    req.session.reload((err) => {
      if (err) {
        console.log(err)
        return socket.disconnect();
      }
      req.session.roomID = roomID;
      req.session.userID = userID;
      req.session.save();
    });
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

    DATABASE[roomID].users[userID] = createUser(username);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("toggleReady", (roomID: string, userID: string) => {
    if (DATABASE.hasOwnProperty(roomID) && DATABASE[roomID].users.hasOwnProperty(userID)) {
      DATABASE[roomID].users[userID].ready = !DATABASE[roomID].users[userID].ready;
      
      // If all players are now ready, start writing phase
      if (DATABASE[roomID].users[userID].ready && allPlayersReady(roomID)) {
        startWritingPhase(roomID);
      }
    }
  });

  socket.on("submitAnswer", (roomID: string, userID: string, answer: string) => {
    if (DATABASE[roomID].gamePhase !== GamePhases.Writing) return;
    DATABASE[roomID].users[userID].answer = answer;
  }); 

  socket.on("submitVote", (roomID: string, userID: string, userIndex: number) => {
    /* TODO
    this doesn't consider the fact that you can vote for the AI
    May need to change index into first 10 characters of userID
    */
    if (DATABASE[roomID].gamePhase !== GamePhases.Voting) return;
    const votedUserID = Object.keys(DATABASE[roomID].users)[userIndex];
    const votedUser = DATABASE[roomID].users[votedUserID];
    votedUser.points += POINTS_PER_VOTE;
    DATABASE[roomID].users[userID].vote = votedUser.username;
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