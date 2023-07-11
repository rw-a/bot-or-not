import { useState, ChangeEventHandler, MouseEventHandler } from 'react';


interface TextInputProps {
  value: string
  placeholder?: string
  required?: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
  className?: string
}

export function TextInput({value, placeholder, required, onChange, className}: TextInputProps) {
  const [hasTouched, setHasTouched] = useState(false);

  const invalidStates = (hasTouched) ? "invalid:border-pink-500 invalid:text-pink-600 focus:invalid:border-pink-500 focus:invalid:ring-pink-500" : "";

  return (
    <input
      type="text" 
      value={value} 
      placeholder={placeholder} 
      required={required} 
      onChange={(event) => {onChange(event), setHasTouched(true)}} 
      onClick={() => setHasTouched(true)} 
      className={invalidStates + (className ?? "") + `
        mt-1 block w-full px-3 py-2 rounded-md text-sm shadow-sm 
        bg-white border border-slate-300 placeholder-slate-400 
        focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
      `}
    ></input>
  );
}


interface ButtonProps {
  children: string
  onClick: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({children, onClick, className}: ButtonProps) {
  return (
    <button
      title={children}
      onClick={onClick}
      className={(className ?? "") + `
        px-5 py-2.5 text-sm leading-5 rounded-md font-semibold
        text-white bg-sky-500 hover:bg-sky-700  
      `}
    >{children}</button>
  );
}