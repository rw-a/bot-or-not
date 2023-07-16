import { useEffect, useState, useRef } from 'react';
import { useTimer } from "react-timer-hook";
import { socket } from './socket';

import './App.css'
import { ServerToClientEvents, GameState, GamePhases } from '../server/types';
import { VOTING_PHASE_DURATION, WRITING_PHASE_DURATION } from '../config';
import { LoginPage } from "./components/login_page";
import { GamePage } from './components/game_page';

function generateID (len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

function App() {
  const userID = useRef("");  // This should be treated like an ephemeral private key. Anyone with this string can impersonate the user
  const [roomID, setRoomID] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [gameState, setGameState] = useState({} as GameState);

  const [answer, setAnswer] = useState("");
  const [vote, setVote] = useState("");   // the index of the user which the player votes for (note for future: index may be unreliable)

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
    socket.emit("toggleReady");
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
        socket.emit("submitVote", vote);
      }
    } else {
      console.error("Timer finished on unexpected game phase:", gameState.gamePhase);
    }
  }

  function onAnswerChange(event: React.FormEvent<HTMLInputElement>) {
    setAnswer(event.currentTarget.value);
  }

  function submitAnswer() {
    socket.emit("submitAnswer", answer);
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
