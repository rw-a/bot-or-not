import { useState, ChangeEventHandler, MouseEventHandler, useRef } from 'react';
import TextTyper from './text_typer';


interface TextInputProps {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  placeholder?: string
  required?: boolean
  verify?: boolean
  errorText?: string  // forces input to count as invalid
  className?: string
}

export function TextInput({value, onChange, placeholder, required, verify, errorText, className}: TextInputProps) {
  const [hasTouched, setHasTouched] = useState(verify);
  
  const invalid = (required && (hasTouched || verify) && !value);

  const color = (invalid) ? 
    "border-danger text-danger focus:border-danger focus:ring-danger" :
    "border-muted focus:border-primary focus:ring-primary";

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
          bg-white border placeholder-muted-dark
          focus:outline-none focus:ring-1 
          dark:text-black
        `}
      ></input>
      <p hidden={!Boolean(invalid || errorText)} className="text-xs text-danger">{errorText || "Required"}</p>
    </>
  );
}


interface ButtonProps {
  disabled?: boolean
  children: string
  onClick: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function Button({disabled, children, onClick, className}: ButtonProps) {
  return (
    <button
      title={children}
      disabled={disabled}
      onClick={onClick}
      className={(className ?? "") + `
        px-5 py-2.5 text-sm leading-5 rounded-md font-semibold 
        text-white bg-primary hover:bg-primary-dark disabled:bg-primary-light disabled:hover:bg-primary
      `}
    >{children}</button>
  );
}

export function ButtonTyper({disabled, children, onClick, className}: ButtonProps) {
  const buttonRef = useRef(null);

  // Prevents the text from being redrawn while it is currently still typing
  const [currentlyDrawing, setCurrentlyDrawing] = useState(false);

  function redraw() {
    if (buttonRef.current && !currentlyDrawing) {
      setCurrentlyDrawing(true);
      const textTyper = new TextTyper(buttonRef.current);
      textTyper.setText(children).then(() => {
        setCurrentlyDrawing(false);
      });
    }
  }

  return (
    <button
      title={children}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={redraw}
      ref={buttonRef}
      className={(className ?? "") + `
        px-5 py-2.5 text-sm leading-5 rounded-md font-semibold 
        text-white bg-primary hover:bg-primary-dark disabled:bg-primary-light disabled:hover:bg-primary
      `}
    >{children}</button>
  );
}