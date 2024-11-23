import * as React from "react"

const Input = React.forwardRef(({ className, type, onKeyPress, ...props }, ref) => {
  const handleKeyPress = (e) => {
    // Shift + Enter for new line
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
    // Enter to send (call original onKeyPress)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyPress?.(e);
    }
  };

  return (
    <textarea
      className={`flex w-full rounded-md border border-gray-700 
        bg-gray-800 px-3 py-2 text-sm text-gray-100
        placeholder:text-gray-400 
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:cursor-not-allowed disabled:opacity-50 
        resize-none min-h-[40px] max-h-[200px] ${className}`}
      ref={ref}
      rows={1}
      onKeyDown={handleKeyPress}
      {...props}
    />
  )
})

Input.displayName = "Input"

export { Input }