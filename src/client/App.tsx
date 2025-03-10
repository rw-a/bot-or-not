import { useEffect, useState, useRef } from 'react';
import { useTimer } from "react-timer-hook";
import { socket } from './socket';

import './App.css'
import { ServerToClientEvents, GameState, GamePhases, LoginErrorType, LoginError, SessionInfo, UserID } from '../server/types';
import { PHASE_DURATIONS } from '../config';
import { LoginPage } from "./components/login_page";
import { GamePage } from './components/game_page';
import { generateID } from '../utility';


function App() {
  const sessionID = useRef("");  // This should be treated like an ephemeral private key. Anyone with this string can impersonate the user
  const [userID, setUserID] = useState("");
  const [roomID, setRoomID] = useState("");

  const [isLoaded, setIsLoaded] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState({} as LoginError);

  const [gameState, setGameState] = useState({} as GameState);

  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");

  const [vote, setVote] = useState("");
  const [submittedVote, setSubmittedVote] = useState("");

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
          restart(new Date(new Date(newGameState.timerStartTime).getTime() + PHASE_DURATIONS[GamePhases.Writing] * 1000));

        } else if (newGameState.gamePhase === GamePhases.Voting) {
          setAnswer("");
          setSubmittedAnswer("");
          restart(new Date(new Date(newGameState.timerStartTime).getTime() + PHASE_DURATIONS[GamePhases.Voting] * 1000));

        } else if (newGameState.gamePhase === GamePhases.VotingResults) {
          setVote("");
          setSubmittedVote("");
          restart(new Date(new Date(newGameState.timerStartTime).getTime() + PHASE_DURATIONS[GamePhases.VotingResults] * 1000));

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

    // Useful for debugging
    socket.onAny((event, ...args) => {
      console.log(event, args);
    });

    const storedSessionID = localStorage.getItem("sessionID");
    if (storedSessionID) {
      restoreSession(storedSessionID);
    } else {
      setIsLoaded(true);
    }

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

      const gameState = sessionInfo.gameState;
      setGameState(gameState);
      if (PHASE_DURATIONS.hasOwnProperty(gameState.gamePhase)) {
        restart(new Date(new Date(gameState.timerStartTime).getTime() + PHASE_DURATIONS[gameState.gamePhase as 1|2|3] * 1000));
      }
    }
    setIsLoaded(true);
  }

  function resetState() {
    sessionID.current = "";
    setUserID("");
    setRoomID("");
    setIsAuthenticated(false);
    setLoginError({} as LoginError);
    setGameState({} as GameState);
    setAnswer("");
    setSubmittedAnswer("");
    setVote("");
    setSubmittedVote("");
  }

  function onReady() {
    socket.emit("toggleReady");
  }

  function onLeave() {
    localStorage.removeItem("sessionID");
    resetState();
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
    }
  }

  function onAnswerChange(newAnswer: string) {
    setAnswer(newAnswer);
  }

  function submitAnswer() {
    setSubmittedAnswer(answer);
    socket.emit("submitAnswer", answer);
  }

  function onVoteChange(votedUserID: UserID) {
    if (votedUserID === userID) return; // can't vote for yourself
    setVote(votedUserID);
  }

  function submitVote() {
    setSubmittedVote(vote);
    socket.emit("submitVote", vote);
  }

  return (
    <div className="container mx-auto px-4 dark:text-white">
      {(!isLoaded) ?
      <></>
      : (!isAuthenticated) ? 
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
        submittedVote={submittedVote}
        onReady={onReady} 
        onLeave={onLeave} 
        onAnswerChange={onAnswerChange} 
        submitAnswer={submitAnswer}
        onVoteChange={onVoteChange}
        submitVote={submitVote}
      ></GamePage>
      }
    </div>
  )
}

export default App
