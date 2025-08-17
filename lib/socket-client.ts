import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    console.log("[v0] Attempting to connect to Railway Socket.io server...")
    socket = io("https://multilingual-chat-server-production.up.railway.app", {
      autoConnect: true,
      transports: ["websocket", "polling"],
    })

    socket.on("connect", () => {
      console.log("[v0] ✅ Connected to Railway Socket.io server:", socket?.id)
    })

    socket.on("disconnect", () => {
      console.log("[v0] ❌ Disconnected from Railway Socket.io server")
    })

    socket.on("connect_error", (error) => {
      console.log("[v0] 🚫 Connection error to Railway:", error.message)
    })
  }
  return socket
}

export default getSocket
