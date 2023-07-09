import { useEffect, useState } from 'react';
import { socket } from './socket';
import './App.css'

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [fooEvents, setFooEvents] = useState([] as string[]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onFooEvent(value: string) {
      console.log(value);
      setFooEvents(previous => [...previous, value]);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('foo', onFooEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('foo', onFooEvent);
    };
  }, []);

  return (
    <>
      <p>Nice</p>
      <button onClick={() => socket.emit("connection", "Hi")}>Connect</button>
      {fooEvents.forEach((value) => <p>{value}</p>)}
    </>
  )
}

export default App
