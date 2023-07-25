import { IncomingMessage } from "http";
import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import session, { Session } from "express-session";
import dotenv from "dotenv";

import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, GamePhases, 
  SessionProperties, SessionInfo, RoundData, RoomID, RoomData, SessionID, UserID } from "./types";
import { WS_PORT, PHASE_DURATIONS, POINTS_PER_VOTE, PHASE_END_LEEWAY_DURATION, 
  NUMBER_ROUNDS_PER_GAME, POINTS_PER_CORRECT_GUESS } from "../config";
import { createUser, getPrompt, saveSession } from "./utility";
import { generateID, getRandomInt } from "../utility";
import llm from "./llm/llm";


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

const DATABASE: {[key: RoomID]: RoomData} = {};
const SESSIONS: {[key: SessionID]: {userID: UserID, roomID: RoomID}} = {};
const ROOM_SESSIONS: {[key: RoomID]: SessionID[]}= {};

// Always have a prompt and response cached, ready for next round, since LLM takes a while
let NEXT_PROMPT = getPrompt();
let NEXT_RESPONSE = "NO RESPONSE";
prepNextResponse();

/* Helper Functions */
function userAlreadyExists(roomID: string, username: string) {
  for (const user of Object.values(DATABASE[roomID].users)) {
    if (user.username === username) {
      return true;
    }
  }
  return false;
}

function getGameState(roomID: string) {
  /*
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
        users[userID] = publicUserData;
      }
      
      gameState.users = users;

    } else {
      // @ts-ignore
      gameState[key as keyof RoomData] = value;
    }
  }
  */

  return DATABASE[roomID];
}

function syncGameState(roomID: string) {
  const gameState = getGameState(roomID);
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
  const room = DATABASE[roomID];
  room.gamePhase = GamePhases.Writing;
  room.timerStartTime = new Date();
  const round: RoundData = {
    prompt: NEXT_PROMPT,
    llmResponse: NEXT_RESPONSE
  }
  room.rounds[room.round] = round;
  syncGameState(roomID);

  prepNextResponse();

  function allPlayersAnswered() {
    for (const user of Object.values(room.users)) {
      if (!user.answers[room.round]) return false;
    }
    return true;
  }

  Promise.race([
    new Promise((resolve) => {setTimeout(resolve, (PHASE_DURATIONS[GamePhases.Writing] + PHASE_END_LEEWAY_DURATION) * 1000);}),
    new Promise<void>((resolve) => {
      /* TODO Maybe
      Change to event listener rather than polling (use roomID as event name)
      */
      setInterval(() => {
        if (allPlayersAnswered()) {
          resolve();
        }
      }, 100);
    })
  ]).then(() => {
    startVotingPhase(roomID);
  });
}

function startVotingPhase(roomID: string) {
  const room = DATABASE[roomID];
  room.gamePhase = GamePhases.Voting;
  room.timerStartTime = new Date();
  syncGameState(roomID);

  function allPlayersVoted() {
    for (const user of Object.values(room.users)) {
      if (!user.votes[room.round]) return false;
    }
    return true;
  }

  Promise.race([
    new Promise((resolve) => {setTimeout(resolve, (PHASE_DURATIONS[GamePhases.Voting] + PHASE_END_LEEWAY_DURATION) * 1000);}),
    new Promise<void>((resolve) => {
      /* TODO Maybe
      Change to event listener rather than polling (use roomID as event name)
      */
      setInterval(() => {
        if (allPlayersVoted()) {
          resolve();
        }
      }, 100);
    })
  ]).then(() => {
    startVotingResultsPhase(roomID);
  });
}

function startVotingResultsPhase(roomID: RoomID) {
  const room = DATABASE[roomID];
  room.gamePhase = GamePhases.VotingResults;
  room.timerStartTime = new Date();

  // Calculate the point allocations from the voting phase
  const userIDs = Object.keys(room.users);
  for (const [userID, user] of Object.entries(room.users)) {
    const votedUserID = user.votes[room.round]

    // If player voted for LLM
    if (votedUserID === room.llmUserID) {
      user.points += POINTS_PER_CORRECT_GUESS;
    
    // If player voted for another player
    } else if (userIDs.hasOwnProperty(votedUserID)) {
      const votedUser = room.users[votedUserID];
      votedUser.points += POINTS_PER_VOTE;
    
    // If player voted for someone invalid OR didn't vote at all
    } else {
      // Randomly vote for someone else
      const otherUserIDs = userIDs.filter((ID) => ID !== userID); // all the userIDs excluding the current user's
      const votedUserID = otherUserIDs[getRandomInt(0, otherUserIDs.length)];
      const votedUser = room.users[votedUserID];
      votedUser.points += POINTS_PER_VOTE;

      user.votes[room.round] = votedUserID; // update the gameState as if they voted for that person
    }
  }

  syncGameState(roomID);

  setTimeout(() => {
    if (room.round < NUMBER_ROUNDS_PER_GAME) {
      room.round += 1;
      startWritingPhase(roomID);
    } else {
      endGame(roomID);
    }
  }, PHASE_DURATIONS[GamePhases.VotingResults] * 1000);
}

function endGame(roomID: string) {
  DATABASE[roomID].gamePhase = GamePhases.End;
  syncGameState(roomID);

  for (const sessionID of ROOM_SESSIONS[roomID]) {
    delete SESSIONS[sessionID];
  }
  delete ROOM_SESSIONS[roomID];
  delete DATABASE[roomID];
}

async function prepNextResponse() {
  NEXT_PROMPT = getPrompt();
  
  const PROMPT_TEMPLATE = `Q: ${NEXT_PROMPT} A:`;
  NEXT_RESPONSE = await llm("./src/server/llm/llama-cpp", "./src/server/llm/open_llama-ggml-q4_0.bin", PROMPT_TEMPLATE, ["\n"]);
  NEXT_RESPONSE = NEXT_RESPONSE.slice(PROMPT_TEMPLATE.length);

  /* TODO
  Fix random colon still showing up
  */

  console.log(`\
  Next Prompt: ${NEXT_PROMPT}
  Next Response: ${NEXT_RESPONSE}`);
}

/* Socket Handling */
io.on("connect", (socket) => {
  const req = socket.request as IncomingMessage & {sessionID: SessionID};

  socket.on("generateRoomID", (callback: (roomID: RoomID) => void) => {
    // Generate roomID until an unonccupied one is found
    let roomID: string;
    do {
      roomID = generateID(5).toUpperCase();
    } while (DATABASE.hasOwnProperty(roomID));

    callback(roomID);
  });

  socket.on("createRoom", (roomID: RoomID, userID: UserID, username: string) => {
    if (DATABASE.hasOwnProperty(roomID)) {
      // This shouldn't happen since room code is checked on generation
      socket.emit("loginError", "room", "Room already exists.");
      return;
    } else {
      // Create room with initial game state
      DATABASE[roomID] = {
        gamePhase: GamePhases.Lobby, 
        timerStartTime: new Date(), 
        round: 1,
        rounds: {},
        users: {}, 
        llmUserID: generateID()
      };
    }

    DATABASE[roomID].users = {[userID]: createUser(username)};
    saveSession(req, roomID, userID);
    SESSIONS[req.sessionID] = {roomID, userID};
    ROOM_SESSIONS[roomID] = [req.sessionID];

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess", req.sessionID);
  });

  socket.on("joinRoom", (roomID: RoomID, userID: UserID, username: string) => {
    if (!DATABASE.hasOwnProperty(roomID)) {
      socket.emit("loginError", "room", "Room doesn't exist.");
      return;
    }

    if (DATABASE[roomID].gamePhase !== GamePhases.Lobby) {
      socket.emit("loginError", "room", "This room has already started.");
      return;
    }

    username = username.trim();

    if (userAlreadyExists(roomID, username)) {
      socket.emit("loginError", "username", "Username already taken.");
      return;
    }

    DATABASE[roomID].users[userID] = createUser(username);
    saveSession(req, roomID, userID);
    SESSIONS[req.sessionID] = {roomID, userID};
    ROOM_SESSIONS[roomID].push(req.sessionID);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess", req.sessionID);
  });

  socket.on("restoreSession", (sessionID: SessionID, callback: (sessionInfo?: SessionInfo) => void) => {
    if (!SESSIONS.hasOwnProperty(sessionID)) {
      callback(undefined);
      return;
    }

    const roomID = SESSIONS[sessionID].roomID;
    const userID = SESSIONS[sessionID].userID;
    const gameState = getGameState(roomID);

    socket.join(roomID);
    const sessionInfo = {
      roomID,
      userID,
      gameState
    }
    callback(sessionInfo);
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
    const room = DATABASE[roomID];

    if (room.gamePhase !== GamePhases.Writing) return;
    room.users[userID].answers[room.round] = answer;
  }); 

  socket.on("submitVote", (votedUserID: UserID) => {
    const roomID = req.session.roomID;
    const userID = req.session.userID;
    const room = DATABASE[roomID];

    if (room.gamePhase !== GamePhases.Voting) return;

    // If voted for another player
    if (room.users.hasOwnProperty(votedUserID)) {
      if (votedUserID === userID) return; // can't vote for yourself
      room.users[userID].votes[room.round] = votedUserID;

    // If voted for LLM
    } else if (votedUserID === room.llmUserID) {
      room.users[userID].votes[room.round] = room.llmUserID;

    // Voted for someone unknown
    } else {
      console.error(`User ${roomID} voted for someone unkwown: ${votedUserID}`);
      return;
    }

    
  }); 

  socket.on("leaveRoom", () => {
    const roomID = req.session.roomID;
    const userID = req.session.userID;
    const sessionID = req.sessionID;

    delete SESSIONS[sessionID];
    delete DATABASE[roomID].users[userID];
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