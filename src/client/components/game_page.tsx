import { FormEventHandler } from 'react';
import { Button } from './components';
import { GameState, GamePhases, UserID, RoomID } from '../../server/types';
import { GAME_PHASE_NAMES } from '../../config';

interface GamePageProps {
  gameState: GameState
  roomID: RoomID
  userID: UserID
  minutes: number
  seconds: number
  answer: string
  submittedAnswer: string
  vote: UserID
  submittedVote: UserID
  onReady: () => void
  onLeave: () => void
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
}

export function GamePage({ 
  gameState, roomID, userID, minutes, seconds, 
  answer, submittedAnswer, vote, submittedVote, 
  onReady, onLeave, onAnswerChange, submitAnswer, onVoteChange, submitVote }: GamePageProps) {

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
          userID={userID}
          answer={answer}
          submittedAnswer={submittedAnswer}
          vote={vote}
          submittedVote={submittedVote}
          onAnswerChange={onAnswerChange}
          submitAnswer={submitAnswer}
          onVoteChange={onVoteChange}
          submitVote={submitVote}
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
      {gameState.gamePhase === GamePhases.Lobby || gameState.gamePhase === GamePhases.End ? <>
        <Button onClick={onLeave}>Leave</Button>
      </> : <>
      <p>Time Remaining: {minutes * 60 + seconds}</p>
      </>}

      {gameState.gamePhase === GamePhases.Lobby ? <>
        <Button onClick={onReady}>{(userReady) ? "Unready" : "Ready"}</Button>
        <p>Room Code: <span className="font-mono">{roomID}</span></p>
      </> : <>
        <p>{GAME_PHASE_NAMES[gameState.gamePhase]}</p>
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
  userID: UserID
  answer: string
  submittedAnswer: string
  vote: UserID
  submittedVote: UserID
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
  className?: string
}

function MainPanel({
  gameState, userID, answer, submittedAnswer, vote, submittedVote, 
  onAnswerChange, submitAnswer, onVoteChange, submitVote, className}: MainPanelProps) {

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
       <MainPanelVoting 
        gameState={gameState} 
        userID={userID}
        vote={vote} 
        submittedVote={submittedVote}
        onVoteChange={onVoteChange}
        submitVote={submitVote}
       ></MainPanelVoting>
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
       >{(submittedAnswer) ? "Resubmit" : "Submit"}</button>
    </div>
  </div>
  );
}

interface MainPanelVoting {
  gameState: GameState
  userID: UserID
  vote: UserID
  submittedVote: UserID
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
}

function MainPanelVoting({gameState, userID: thisUserID, vote, submittedVote, onVoteChange, submitVote}: MainPanelVoting) {
  /* Maybe use grid instead */
  /* TODO
  Show who you voted for and prevent further voting
  Change the background of the submittedVote person. Probably not the same as hover colour
  */
  return (
  <div className="basis-full">
    <div className="flex flex-wrap justify-evenly">
      {Object.entries(gameState.users).map(([userID, user]) => 
      (thisUserID !== userID) ? 
      <div key={userID} className={"cursor-pointer hover:bg-muted" + (vote === userID ? " bg-muted": "")} onClick={() => {onVoteChange(userID)}}>
        <p>User: {user.username}</p>
        <p>Response: {user.answers[gameState.round]}</p>
      </div>
      : "")}
      <div className={"cursor-pointer hover:bg-muted" + (vote === gameState.llmUserID ? " bg-muted": "")} onClick={() => {onVoteChange(gameState.llmUserID)}}>
        <p>User: LLM</p>
        <p>Response: {gameState.rounds[gameState.round].llmResponse}</p>
      </div>
    </div>
    <Button onClick={submitVote}>Submit Vote</Button>
  </div>
  );
}