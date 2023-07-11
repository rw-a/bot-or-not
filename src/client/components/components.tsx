import { useState, ChangeEventHandler, MouseEventHandler } from 'react';


interface TextInputProps {
  value: string
  placeholder?: string
  required?: boolean
  invalid?: boolean
  errorText?: string
  onChange: ChangeEventHandler<HTMLInputElement>
  className?: string
}

export function TextInput({value, placeholder, required, invalid: forceInvalid, errorText, onChange, className}: TextInputProps) {
  const [hasTouched, setHasTouched] = useState(false);

  const invalid = (required && hasTouched && !value);

  const color = (forceInvalid || invalid) ? 
    "border-pink-500 text-pink-600 focus:border-pink-500 focus:ring-pink-500" :
    "border-slate-300 focus:border-sky-500 focus:ring-sky-500";

  return (
    <>
      <input
        type="text" 
        value={value} 
        placeholder={placeholder} 
        required={required} 
        onChange={(event) => {onChange(event), setHasTouched(true)}} 
        onBlur={() => setHasTouched(true)} 
        className={`${className ?? ""} ${color}
          block w-full px-3 py-2 rounded-md text-sm shadow-sm 
          bg-white border placeholder-slate-400 
          focus:outline-none focus:ring-1 
        `}
      ></input>
      <p className={`${(forceInvalid || invalid) ? "" : "invisible"} 
        text-xs text-red-500`}>{errorText ?? "Required"}</p>
    </>
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