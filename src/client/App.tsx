import { useEffect, useState, useRef } from 'react';
import { socket } from './socket';
import './App.css'


function generateId (len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

interface LoginFormProps {
  onLogin: (roomCode: string, newUsername: string, create: boolean) => void
}

function LoginForm({onLogin}: LoginFormProps) {
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

  function handleCreate() {
    onLogin(generateId(), username, true);
  }

  return (
    <div>
      <p>Username</p>
      <input type="text" value={username} onChange={handleUsernameChange}></input>
      <div id="join-type-selector">
        <div>
          <label>Room Code</label>
          <input type="text" value={roomID} onChange={handleRoomIDChange}></input>
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

function App() {
  const roomId = useRef("");
  const userID = useRef("");
  const [username, setUsername] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

    function loginCallback() {
      setIsAuthenticated(true);
    }

    function onDisconnect() {
      setIsAuthenticated(false);
    }

    function onConnectError(err: Error) {
      console.log(err);
    }

    socket.on('loginCallback', loginCallback);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('loginCallback', loginCallback);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  function onLogin(roomCode: string, newUsername: string, create: boolean) {
    roomId.current = roomCode;
    userID.current = generateId();
    setUsername(newUsername);

    if (create) {
      socket.emit("create", roomCode, userID.current, newUsername);
    } else {
      socket.emit("join", roomCode, userID.current, newUsername);
    }
  }

  return (
    <>
      {(!isAuthenticated) ? <LoginForm onLogin={onLogin}></LoginForm> : "Logged In"}
    </>
  )
}

export default App
