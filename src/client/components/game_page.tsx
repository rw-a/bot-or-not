import { ChangeEventHandler } from 'react';
import { Button } from './components';
import { GameState, GamePhases } from '../../server/types';

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

export function GamePage({ gameState, roomID, minutes, seconds, answer, vote, onReady, onAnswerChange, submitAnswer }: GamePageProps) {
  return (
    <div className="flex flex-col border-solid border-slate-700 border-[1px] rounded-md">
      <TopBar 
        gameState={gameState} 
        roomID={roomID} 
        minutes={minutes} 
        seconds={seconds} 
        onReady={onReady} 
        className="flex justify-evenly"
      />
      <div className="flex">
        <SidePanel gameState={gameState} className="basis-1/4"/>
        <MainPanel 
          gameState={gameState}
          answer={answer}
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
  minutes: number
  seconds: number
  onReady: () => void
  className?: string
}

function TopBar({gameState, roomID, minutes, seconds, onReady, className}: TopBarProps) {
  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby ? <>
        <Button onClick={onReady}>Ready</Button>
        <p>Room Code: {roomID}</p>
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
        {Object.entries(gameState.users).map(([index, user]) =>
          <div key={index} className={`border-[1px] border-${user.ready ? "success" : "danger"}`}>
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
  onAnswerChange: ChangeEventHandler<HTMLInputElement>
  submitAnswer: () => void
  className?: string
}

function MainPanel({gameState, answer, submitAnswer, onAnswerChange, className}: MainPanelProps) {
  /* TODO
  Make the input box bigger to support paragraph response
  */
  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby ? <>
        {Object.keys(gameState.users).length < 2 ? 
        "Waiting for more players to join..."
        : "Waiting for players to ready up..."}
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
  );
}