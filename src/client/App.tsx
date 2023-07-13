import { useEffect, useState, useRef } from 'react';
import { useTimer } from "react-timer-hook";
import { socket } from './socket';

import './App.css'
import { ServerToClientEvents, GameState, GamePhases } from '../server/types';
import { VOTING_PHASE_DURATION, WRITING_PHASE_DURATION } from '../config';
import { Button, TextInput } from './components/components';

function generateID (len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

interface LoginPageProps {
  onLogin: (roomCode: string, newUsername: string, create: boolean) => void
  loginError: string
}

function LoginPage({onLogin, loginError}: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");

  // Tracks whether the user has tried to submit the login
  const [triedLogin, setTriedLogin] = useState(false);  // login = join OR create room
  const [triedJoin, setTriedJoin] = useState(false);

  function handleUsernameChange(event: React.FormEvent<HTMLInputElement>) {
    setUsername(event.currentTarget.value);
  }

  function handleRoomIDChange(event: React.FormEvent<HTMLInputElement>) {
    setRoomID(event.currentTarget.value);
  }

  function handleJoin() {
    if (!username) {
      setTriedLogin(true);
      setTriedJoin(true);
      return;
    }

    onLogin(roomID, username, false);
  }

  async function handleCreate() {
    if (!username) {
      setTriedLogin(true);
      return;
    }

    const roomID: string = await socket.emitWithAck("generateRoomID");
    onLogin(roomID, username, true);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Title</h1>
      <div>
        <p className="text-lg font-medium">Username</p>
        <TextInput 
          required 
          value={username} 
          placeholder='Enter your name...'
          onChange={handleUsernameChange}
          verify={triedLogin}
        ></TextInput>
      </div>
      <div className="flex justify-around items-center">
        <div>
          <p className="text-lg font-medium">Room Code</p>
          <TextInput 
            required
            value={roomID} 
            onChange={handleRoomIDChange}
            verify={Boolean(loginError) || triedJoin}
            errorText={loginError}
          ></TextInput>
          <Button onClick={handleJoin}>Join Room</Button>
        </div>
        <div>
          <Button onClick={handleCreate}>Create Room</Button>
        </div>
      </div>
    </div>
  );
}

interface GamePageProps {
  roomID: string
  gameState: GameState
  onReady: () => void
}

function GamePage({gameState, roomID, onReady}: GamePageProps) {
  const {
    seconds,
    minutes,
    hours,
    days,
    isRunning,
    start,
    pause,
    resume,
    restart,
  } = useTimer({ 
    expiryTimestamp: new Date(new Date(gameState.timerStartTime).getTime() + WRITING_PHASE_DURATION * 1000), 
    onExpire: onTimerDone,
    autoStart: false
  });

  const [answer, setAnswer] = useState("");
  const [vote, setVote] = useState(-1);   // the index of the user which the player votes for (note for future: index may be unreliable)

  // Start timer once appropriate phase starts
  if (gameState.gamePhase === GamePhases.Writing && !isRunning) {
    start();
  }
  if (gameState.gamePhase === GamePhases.Voting && !isRunning) {
    restart(new Date(new Date(gameState.timerStartTime).getTime() + VOTING_PHASE_DURATION * 1000));
  }

  function onTimerDone() {
    pause();

    if (gameState.gamePhase === GamePhases.Writing) {
      socket.emit("submitAnswer", answer);
    } else if (gameState.gamePhase === GamePhases.Voting) {
      socket.emit("submitVote", vote);
    } else {
      console.error("Timer finished on unexpected game phase:", gameState.gamePhase);
    }
  }

  return (
    <div className="flex flex-col border-solid border-slate-700 border-[1px] rounded-md">
      <div className="flex justify-evenly">
        {gameState.gamePhase === GamePhases.Lobby ? <>
          <Button onClick={onReady}>Ready</Button>
          <p>Room Code: {roomID}</p>
        </> : <>
          <p>Time Remaining: {minutes * 60 + seconds}</p>
        </>}
      </div>
      <div className="flex">
        <div className="basis-1/4">
          {Object.entries(gameState.users).map(([index, user]) => 
          <div key={index} className={`border-[1px] border-${user.ready ? "success" : "danger"}`}>
            <p>{user.username}</p>
            <p>Points: {user.points}</p>
          </div>
          )}
        </div>
        <div className="basis-3/4 border">
          Main Game
        </div>
      </div>
    </div>
  );
}

function App() {
  const userID = useRef("");  // This should be treated like an ephemeral private key. Anyone with this string can impersonate the user
  const [roomID, setRoomID] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [gameState, setGameState] = useState({} as GameState);

  useEffect(() => {
    /* 
    TODO: Way to restore session if you close tab
    Note: currently does nothing
    const storedSessionID = localStorage.getItem("sessionID");
    if (storedSessionID) {
      setIsAuthenticated(true);
      socket.auth = {
        sessionID: storedSessionID 
      };
      socket.connect();
    } 
    */

    function onConnectError(error: Error) {
      /* Auto-connect is enabled. Maybe make an alert */
      console.log(error);
    }

    function onDisconnect() {
      setIsAuthenticated(false);
    }

    function onLoginError(errorMessage: string) {
      setLoginError(errorMessage);
    }

    function onLoginSuccess() {
      setIsAuthenticated(true);
    }

    function onSyncGameState(newGameState: GameState) {
      setGameState(newGameState);
    }
    
    const EVENT_LISTENERS: ServerToClientEvents = {
      connect_error: onConnectError,
      disconnect: onDisconnect,
      loginError: onLoginError,
      loginSuccess: onLoginSuccess,
      syncGameState: onSyncGameState
    };

    for (const [eventName, eventHandler] of Object.entries(EVENT_LISTENERS)) {
      socket.on(eventName, eventHandler);
    }

    socket.onAny((event, ...args) => {
      console.log(event, args);
    });

    return () => {
      for (const [eventName, eventHandler] of Object.entries(EVENT_LISTENERS)) {
        socket.off(eventName, eventHandler);
      }
    };
  }, []);

  function onLogin(newRoomID: string, newUsername: string, create: boolean) {
    userID.current = generateID();
    setRoomID(newRoomID);

    if (create) {
      socket.emit("createRoom", newRoomID, userID.current, newUsername);
    } else {
      socket.emit("joinRoom", newRoomID, userID.current, newUsername);
    }
  }

  function onReady() {
    socket.emit("toggleReady", roomID, userID.current);
  }

  function moveToVoting() {

  }

  return (
    <div className="container mx-auto px-4">
      {(!isAuthenticated) ? 
      <LoginPage onLogin={onLogin} loginError={loginError}></LoginPage> : 
      <GamePage gameState={gameState} roomID={roomID} onReady={onReady}></GamePage>
      }
    </div>
  )
}

export default App
