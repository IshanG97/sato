import type React from "react"
import ProtectedRoute from "@/app/protected-route"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
