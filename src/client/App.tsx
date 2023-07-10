import { useEffect, useState, useRef } from 'react';
import { socket } from './socket';
import './App.css'

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
      <div>
        <p>Username</p>
        <input type="text" value={username} onChange={handleUsernameChange}></input>
      </div>
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

function GamePage() {
  return (
    <>
    </>
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

    function loginCallback(success: boolean, errorMessage: string) {
      if (success) {
        setIsAuthenticated(true);
      } else {
        /* TODO: Make element */
        console.log(errorMessage);
      }
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

    socket.onAny((event, ...args) => {
      console.log(event, args);
    });

    return () => {
      socket.off('loginCallback', loginCallback);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  function onLogin(newRoomID: string, newUsername: string, create: boolean) {
    roomId.current = newRoomID;
    userID.current = generateID();
    setUsername(newUsername);

    if (create) {
      socket.emit("create", newRoomID, userID.current, newUsername);
    } else {
      socket.emit("join", newRoomID, userID.current, newUsername);
    }
  }

  return (
    <>
      {(!isAuthenticated) ? 
      <LoginPage onLogin={onLogin}></LoginPage> : 
      <GamePage></GamePage>
      }
    </>
  )
}

export default App
