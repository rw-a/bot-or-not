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

interface GamePageProps {
  usernames: string[]
}

function GamePage({usernames}: GamePageProps) {
  return (
    <div>
      <div id="side-panel">
        {usernames.map((username) => <p key={username}>{username}</p>)}
      </div>
      <div id="main-panel"></div>
    </div>
  );
}

function App() {
  const roomID = useRef("");
  const userID = useRef("");
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernames, setUsernames] = useState([] as string[]);


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

    function loginError(errorMessage: string) {
      /* TODO: Make element */
      console.log(errorMessage);
    }

    function loginSuccess(otherUsernames: string[]) {
      setUsernames((previous) => [...previous, ...otherUsernames]);
      setIsAuthenticated(true);
    }

    function onDisconnect() {
      setIsAuthenticated(false);
    }

    function onConnectError(err: Error) {
      console.log(err);
    }

    socket.on('loginError', loginError);
    socket.on('loginSuccess', loginSuccess);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    socket.onAny((event, ...args) => {
      console.log(event, args);
    });

    return () => {
      socket.off('loginError', loginError);
      socket.off('loginSuccess', loginSuccess);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  function onLogin(newRoomID: string, username: string, create: boolean) {
    roomID.current = newRoomID;
    userID.current = generateID();
    setUsernames([username]);

    if (create) {
      socket.emit("create", newRoomID, userID.current, username);
    } else {
      socket.emit("join", newRoomID, userID.current, username);
    }
  }

  return (
    <>
      {(!isAuthenticated) ? 
      <LoginPage onLogin={onLogin}></LoginPage> : 
      <GamePage usernames={usernames}></GamePage>
      }
    </>
  )
}

export default App
