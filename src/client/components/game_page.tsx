import { FormEventHandler } from 'react';
import { Button } from './components';
import { GameState, GamePhases } from '../../server/types';

interface GamePageProps {
  gameState: GameState
  roomID: string
  userID: string
  minutes: number
  seconds: number
  answer: string
  submittedAnswer: string
  vote: string
  onReady: () => void
  onLeave: () => void
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
}

export function GamePage({ gameState, roomID, userID, minutes, seconds, answer, submittedAnswer, vote, onReady, onLeave, onAnswerChange, submitAnswer }: GamePageProps) {
  return (
    <div className="flex flex-col border-solid border-slate-700 border-[1px] rounded-md">
      <TopBar 
        gameState={gameState} 
        roomID={roomID} 
        userID={userID} 
        minutes={minutes} 
        seconds={seconds} 
        onReady={onReady} 
        onLeave={onLeave}
        className="flex justify-between"
      />
      <div className="flex">
        <SidePanel gameState={gameState} className="basis-1/4"/>
        <MainPanel 
          gameState={gameState}
          answer={answer}
          submittedAnswer={submittedAnswer}
          submitAnswer={submitAnswer}
          onAnswerChange={onAnswerChange}
          className="basis-3/4 border flex"
        />
      </div>
    </div>
  );
}

interface TopBarProps {
  gameState: GameState
  roomID: string
  userID: string
  minutes: number
  seconds: number
  onReady: () => void
  onLeave: () => void
  className?: string
}

function TopBar({gameState, roomID, userID, minutes, seconds, onReady, onLeave, className}: TopBarProps) {
  /* TODO
  Will need to add property in room data that tracks whether user is active or not (also update disconnected sessions to reflect this)
  Ready button should change color based on user's ready state
  */
  const userReady = gameState.users[userID].ready;

  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby ? <>
        <Button onClick={onLeave}>Leave</Button>
        <Button onClick={onReady}>{(userReady) ? "Unready" : "Ready"}</Button>
        <p>Room Code: <span className="font-mono">{roomID}</span></p>
      </> : <>
        <p>Time Remaining: {minutes * 60 + seconds}</p>
        <p>Round: {gameState.round}</p>
      </>}
    </div>
  );
}

interface SidePanelProps {
  gameState: GameState
  className?: string
}

function SidePanel({gameState, className}: SidePanelProps) {
  return (
    <div className={className}>
        {Object.entries(gameState.users).map(([userID, user]) =>
          <div key={userID} className={`border-[1px] border-${user.ready ? "success" : "danger"}`}>
            <p>{user.username}</p>
            <p>Points: {user.points}</p>
          </div>
        )}
    </div>
  );
}

interface MainPanelProps {
  gameState: GameState
  answer: string
  submittedAnswer: string
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
  className?: string
}

function MainPanel({gameState, answer, submittedAnswer, submitAnswer, onAnswerChange, className}: MainPanelProps) {
  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby ? <>
        {Object.keys(gameState.users).length < 2 ? 
        "Waiting for more players to join..."
        : "Waiting for players to ready up..."}
      </> : (gameState.gamePhase === GamePhases.Writing) ? <>
        <MainPanelWriting 
          gameState={gameState} 
          answer={answer} 
          submittedAnswer={submittedAnswer} 
          onAnswerChange={onAnswerChange} 
          submitAnswer={submitAnswer}
        ></MainPanelWriting>
      </> : (gameState.gamePhase === GamePhases.VotingResults) ? <>
        Voting Results
      </> : (gameState.gamePhase === GamePhases.Voting) ? <>
       <MainPanelVoting gameState={gameState}></MainPanelVoting>
      </> : <>
        Game Done
      </>}
    </div>
  );
}

interface MainPanelWritingProps {
  gameState: GameState
  answer: string
  submittedAnswer: string
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
}

function MainPanelWriting({gameState, answer, submittedAnswer, onAnswerChange, submitAnswer}: MainPanelWritingProps) {
  const answerSaved = answer === submittedAnswer;

  return (
    <div className="flex flex-col basis-full justify-between">
    <div>
      Prompt: {gameState.rounds[gameState.round].prompt}
    </div>
    <div className="flex border-[1px] w-full">
      <textarea value={answer} onInput={onAnswerChange} className="w-full resize-none"></textarea>
      <button 
        onClick={submitAnswer} 
        disabled={answerSaved}
        className={`border-[1px] border-${(answerSaved) ? "muted" : "success"} ${answerSaved ? "text-muted" : ""}`}
       >Submit</button>
    </div>
  </div>
  );
}

interface MainPanelVoting {
  gameState: GameState
}

function MainPanelVoting({gameState}: MainPanelVoting) {
  return (
    <div className="flex flex-wrap basis-full justify-evenly">
    {Object.entries(gameState.users).map(([userID, user]) => 
    <div key={userID}>
      <p>User: {user.username}</p>
      <p>Response: {user.answers[gameState.round]}</p>
    </div>
    )}
    <div>
      <p>User: LLM</p>
      <p>Response: {gameState.rounds[gameState.round].llmResponse}</p>
    </div>
  </div>
  );
}