import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import { Server as HTTPServer } from "http"

// Global socket server instance
let io: SocketIOServer | null = null
let queue: any[] = []

export async function GET(req: NextRequest) {
  if (!io) {
    // Create HTTP server for Socket.io
    const httpServer = new HTTPServer()
    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("[v0] User connected:", socket.id)

      socket.on("joinQueue", () => {
        // Prevent duplicate join
        if (!queue.find((s) => s.id === socket.id)) {
          queue.push(socket)
        }
        console.log(
          "[v0] Queue:",
          queue.map((s) => s.id),
        )

        // Pair if 2+ users waiting
        if (queue.length >= 2) {
          const [user1, user2] = queue.splice(0, 2)

          if (user1.id !== user2.id) {
            const roomID = `room_${user1.id}_${user2.id}`

            user1.join(roomID)
            user2.join(roomID)

            user1.emit("paired", { roomID })
            user2.emit("paired", { roomID })

            console.log(`[v0] Paired users: ${user1.id} <-> ${user2.id} in room: ${roomID}`)
          }
        }
      })

      socket.on("sendMessage", (data: { roomID: string; message: string }) => {
        io?.to(data.roomID).emit("receiveMessage", {
          message: data.message,
          sender: socket.id,
        })
      })

      socket.on("disconnect", () => {
        queue = queue.filter((s) => s.id !== socket.id)
        console.log("[v0] User disconnected:", socket.id)
      })
    })

    // Start the HTTP server
    httpServer.listen(3001)
  }

  return new Response("Socket.io server initialized", { status: 200 })
}
