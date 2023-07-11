import { useEffect, useState, useRef } from 'react';
import { socket } from './socket';

import './App.css'
import { RoomData } from '../server/types';
import { TextInput } from './components/components';

function generateID (len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

interface LoginPageProps {
  onLogin: (roomCode: string, newUsername: string, create: boolean) => void
}

function LoginPage({onLogin}: LoginPageProps) {
  /* TODO: add validation */

  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");

  function handleUsernameChange(event: React.FormEvent<HTMLInputElement>) {
    setUsername(event.currentTarget.value);
  }

  function handleRoomIDChange(event: React.FormEvent<HTMLInputElement>) {
    setRoomID(event.currentTarget.value);
  }

  function handleLogin() {
    onLogin(roomID, username, false);
  }

  async function handleCreate() {
    const roomID: string = await socket.emitWithAck("generateRoomID");
    onLogin(roomID, username, true);
  }

  return (
    <div>
      <h1>Title</h1>
      <div>
        <p>Username</p>
        <TextInput 
          required 
          value={username} 
          placeholder='Enter your name...'
          onChange={handleUsernameChange}
        ></TextInput>
      </div>
      <div>
        <div>
          <label>Room Code</label>
          <TextInput 
            value={roomID} 
            onChange={handleRoomIDChange}
          ></TextInput>
          <br></br>
          <button onClick={handleLogin}>Join Room</button>
        </div>
        <div>
          <button onClick={handleCreate}>Create Room</button>
        </div>
      </div>
    </div>
  );
}

interface GamePageProps {
  roomID: string
  gameState: RoomData
}

function GamePage({gameState, roomID}: GamePageProps) {
  const usernames = [];
  for (const user of Object.values(gameState)) {
    usernames.push(user.username);
  }

  return (
    <div>
      <div id="top-bar">
        <p>{roomID}</p>
      </div>
      <div>
        <div id="side-panel">
          {usernames.map((username) => <p key={username}>{username}</p>)}
        </div>
        <div id="main-panel"></div>
      </div>
    </div>
  );
}

function App() {
  const userID = useRef("");
  const [roomID, setRoomID] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [gameState, setGameState] = useState({} as RoomData);

  useEffect(() => {
    // Attempt login
    const storedSessionID = localStorage.getItem("sessionID");
    if (storedSessionID) {
      setIsAuthenticated(true);
      socket.auth = {
        sessionID: storedSessionID 
      };
      socket.connect();
    } 

    function onConnectError(err: Error) {
      console.log(err);
    }

    function loginError(errorMessage: string) {
      /* TODO: Make element */
      console.log(errorMessage);
    }

    function loginSuccess() {
      setIsAuthenticated(true);
    }

    function syncGameState(newGameState: RoomData) {
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
      socket.emit("create", newRoomID, userID.current, newUsername);
    } else {
      socket.emit("join", newRoomID, userID.current, newUsername);
    }
  }

  return (
    <div className="container mx-auto px-4">
      {(!isAuthenticated) ? 
      <LoginPage onLogin={onLogin}></LoginPage> : 
      <GamePage gameState={gameState} roomID={roomID}></GamePage>
      }
    </div>
  )
}

export default App
