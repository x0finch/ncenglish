import { Toaster as Sonner } from "sonner"

/** App-level toast host; call `toast` / `toast.message` from `sonner`. */
export function Toaster() {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      gap={8}
      closeButton={false}
    />
  )
}
