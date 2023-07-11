import { useEffect, useState, useRef } from 'react';
import { socket } from './socket';

import './App.css'
import { GameState } from '../server/types';
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
  return (
    <div className="flex flex-col border-solid border-slate-700 border-[1px] rounded-md">
      <div className="flex justify-evenly">
        <Button onClick={onReady}>Ready</Button>
        <p>Room Code: {roomID}</p>
      </div>
      <div className="flex">
        <div className="basis-1/4">
          {Object.entries(gameState).map(([index, user]) => 
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

  const [gameState, setGameState] = useState([] as GameState);

  useEffect(() => {
    /* Note: currently does nothing */
    const storedSessionID = localStorage.getItem("sessionID");
    if (storedSessionID) {
      setIsAuthenticated(true);
      socket.auth = {
        sessionID: storedSessionID 
      };
      socket.connect();
    } 

    function onConnectError(err: Error) {
      /* Auto-connect is enabled. Maybe make an alert */
      console.log(err);
    }

    function loginError(errorMessage: string) {
      setLoginError(errorMessage);
    }

    function loginSuccess() {
      setIsAuthenticated(true);
    }

    function syncGameState(newGameState: GameState) {
      setGameState(newGameState);
    }

    function onDisconnect() {
      setIsAuthenticated(false);
    }

    socket.on('loginError', loginError);
    socket.on('loginSuccess', loginSuccess);
    socket.on('syncGameState', syncGameState);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    socket.onAny((event, ...args) => {
      console.log(event, args);
    });

    return () => {
      socket.off('loginError', loginError);
      socket.off('loginSuccess', loginSuccess);
      socket.off('syncGameState', syncGameState);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
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
