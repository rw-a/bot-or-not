import { useEffect, useState, useRef } from 'react';
import { useTimer } from "react-timer-hook";
import { socket } from './socket';

import './App.css'
import { ServerToClientEvents, GameState, GamePhases, LoginErrorType, LoginError, SessionInfo } from '../server/types';
import { VOTING_PHASE_DURATION, WRITING_PHASE_DURATION } from '../config';
import { LoginPage } from "./components/login_page";
import { GamePage } from './components/game_page';
import { generateID, getRandomInt } from '../utility';


function App() {
  const sessionID = useRef("");  // This should be treated like an ephemeral private key. Anyone with this string can impersonate the user
  const [userID, setUserID] = useState("");
  const [roomID, setRoomID] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState({} as LoginError);

  const [gameState, setGameState] = useState({} as GameState);

  const [answer, setAnswer] = useState("");
  const [vote, setVote] = useState("");   // the index of the user which the player votes for (note for future: index may be unreliable)
  const [submittedAnswer, setSubmittedAnswer] = useState("");

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
    const storedSessionID = localStorage.getItem("sessionID");
    if (storedSessionID) {
      restoreSession(storedSessionID);
    } 

    function onConnectError(error: Error) {
      /* Auto-connect is enabled. Maybe make an alert */
      console.error(error);
    }

    function onDisconnect() {
      setIsAuthenticated(false);
    }

    function onLoginError(errorType: LoginErrorType, errorMessage: string) {
      const loginError: LoginError = {
        errorType, 
        errorMessage
      }
      setLoginError(loginError);
    }

    function onLoginSuccess(newSessionID: string) {
      sessionID.current = newSessionID;
      localStorage.setItem("sessionID", newSessionID);
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
    const newUserID = generateID();
    setUserID(newUserID);
    setRoomID(newRoomID);

    if (create) {
      socket.emit("createRoom", newRoomID, newUserID, newUsername);
    } else {
      socket.emit("joinRoom", newRoomID, newUserID, newUsername);
    }
  }

  async function restoreSession(storedSessionID: string) {
    const sessionInfo: SessionInfo = await socket.emitWithAck("restoreSession", storedSessionID);
    if (sessionInfo) {
      sessionID.current = storedSessionID;
      setUserID(sessionInfo.userID);
      setRoomID(sessionInfo.roomID);
      setIsAuthenticated(true);
      setGameState(sessionInfo.gameState);
    }
  }

  function onReady() {
    socket.emit("toggleReady");
  }

  function onLeave() {
    /* TODO
    Currently client side only
    Needs to do something on the server side too
    */
    localStorage.removeItem("sessionID");
    setIsAuthenticated(false);
  }

  function onTimerDone() {
    if (gameState.gamePhase === GamePhases.Writing) {
      // Automatically submit the player's answer
      if (answer) {
        submitAnswer();
      } else {
        // If the player wrote nothing
        socket.emit("submitAnswer", "NO RESPONSE");
      }
    } else if (gameState.gamePhase === GamePhases.Voting) {
      if (!vote) {
        // If the player didn't vote for anyone

        // Randomly choose a player to vote for
        /* TODO
        Move to server side so that players who log out will still randomly vote
        OR update how server handles logged out people
        */
        const userIDs = Object.keys(gameState.users).filter((id) => id !== userID);
        const randomUserID = userIDs[getRandomInt(0, userIDs.length)];
        socket.emit("submitVote", randomUserID);
      }
    } else {
      console.error("Timer finished on unexpected game phase:", gameState.gamePhase);
    }
  }

  function onAnswerChange(event: React.FormEvent<HTMLTextAreaElement>) {
    setAnswer(event.currentTarget.value);
  }

  function submitAnswer() {
    setSubmittedAnswer(answer);
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
        userID={userID}
        minutes={minutes}
        seconds={seconds}
        answer={answer}
        submittedAnswer={submittedAnswer}
        vote={vote}
        onReady={onReady} 
        onLeave={onLeave} 
        onAnswerChange={onAnswerChange} 
        submitAnswer={submitAnswer}
      ></GamePage>
      }
    </div>
  )
}

export default App
