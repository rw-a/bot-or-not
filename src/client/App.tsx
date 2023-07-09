import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <p>Nice</p>
      <p>{import.meta.env.VITE_WS_PORT}</p>
    </>
  )
}

export default App
