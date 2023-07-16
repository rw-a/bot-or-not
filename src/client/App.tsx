import { useEffect, useState, useRef, ChangeEventHandler } from 'react';
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
  gameState: GameState
  roomID: string
  minutes: number
  seconds: number
  answer: string
  vote: string
  onReady: () => void
  onAnswerChange: ChangeEventHandler<HTMLInputElement>
  submitAnswer: () => void
}

function GamePage({gameState, roomID, minutes, seconds, answer, vote, onReady, onAnswerChange, submitAnswer}: GamePageProps) {
  /* TODO
  Make the input box bigger to support paragraph response
  */

  return (
    <div className="flex flex-col border-solid border-slate-700 border-[1px] rounded-md">
      <div className="flex justify-evenly">
        {gameState.gamePhase === GamePhases.Lobby ? <>
          <Button onClick={onReady}>Ready</Button>
          <p>Room Code: {roomID}</p>
        </> : <>
          <p>Time Remaining: {minutes * 60 + seconds}</p>
          <p>Round: {gameState.round}</p>
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
        <div className="basis-3/4 border flex">
          {gameState.gamePhase === GamePhases.Lobby ? <>
            Waiting for players...
          </> : (gameState.gamePhase === GamePhases.Writing ? <>
            <div className="flex flex-col basis-full justify-between">
              <div>
                Prompt: {gameState.prompt}
              </div>
              <div className="flex border-[1px] w-full">
                <input type="text" value={answer} onChange={onAnswerChange} className="w-full"></input>
                <button onClick={submitAnswer} className={`border-[1px] border-${answer ? "success" : "danger"}`}>Submit</button>
              </div>
            </div>
          </> : (gameState.gamePhase === GamePhases.Voting) ? <>
            Vote for player
          </> : <>
            Game Done
          </>)}
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

  const [answer, setAnswer] = useState("");
  const [vote, setVote] = useState(0);   // the index of the user which the player votes for (note for future: index may be unreliable)

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
    expiryTimestamp: new Date(), 
    onExpire: onTimerDone,
    autoStart: false
  });

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
      console.error(error);
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

      if (minutes * 60 + seconds === 0) {
        if (newGameState.gamePhase === GamePhases.Writing) {
          restart(new Date(new Date(newGameState.timerStartTime).getTime() + WRITING_PHASE_DURATION * 1000));
        } else if (newGameState.gamePhase === GamePhases.Voting) {
          restart(new Date(new Date(newGameState.timerStartTime).getTime() + VOTING_PHASE_DURATION * 1000));
        }
      }
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

  function onTimerDone() {
    if (gameState.gamePhase === GamePhases.Writing) {
      if (!answer) {
        submitAnswer();
      }
    } else if (gameState.gamePhase === GamePhases.Voting) {
      if (!vote) {
        /* TODO
        Randomly choose some to vote for
        */
        socket.emit("submitVote", roomID, userID.current, vote);
      }
    } else {
      console.error("Timer finished on unexpected game phase:", gameState.gamePhase);
    }
  }

  function onAnswerChange(event: React.FormEvent<HTMLInputElement>) {
    setAnswer(event.currentTarget.value);
  }

  function submitAnswer() {
    socket.emit("submitAnswer", roomID, userID.current, answer);
  }

  return (
    <div className="container mx-auto px-4">
      {(!isAuthenticated) ? 
      <LoginPage 
        onLogin={onLogin} 
        loginError={loginError}
      ></LoginPage> : 
      <GamePage 
        gameState={gameState} 
        roomID={roomID} 
        minutes={minutes}
        seconds={seconds}
        answer={answer}
        vote={vote}
        onReady={onReady} 
        onAnswerChange={onAnswerChange} 
        submitAnswer={submitAnswer}
      ></GamePage>
      }
    </div>
  )
}

export default App
