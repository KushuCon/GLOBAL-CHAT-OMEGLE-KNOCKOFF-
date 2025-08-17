export const dynamic = "force-dynamic"

// Simple in-memory queue - no database needed
const waitingUsers: Array<{
  id: string
  username: string
  language: string
  timestamp: number
}> = []

const chatRooms: Array<{
  roomCode: string
  users: string[]
}> = []

export async function POST(request: Request) {
  try {
    const { action, userId, username, language } = await request.json()

    if (action === "join") {
      console.log(`[v0] User ${username} joining queue`)

      // Add user to waiting queue
      const user = {
        id: userId,
        username,
        language,
        timestamp: Date.now(),
      }

      waitingUsers.push(user)
      console.log(`[v0] Queue size: ${waitingUsers.length}`)

      // Check if we can pair users
      if (waitingUsers.length >= 2) {
        const user1 = waitingUsers.shift()!
        const user2 = waitingUsers.shift()!

        const roomCode = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

        chatRooms.push({
          roomCode,
          users: [user1.id, user2.id],
        })

        console.log(`[v0] Paired ${user1.username} and ${user2.username} in room ${roomCode}`)

        return Response.json({
          paired: true,
          roomCode,
          partner: user.id === user1.id ? user2.username : user1.username,
        })
      }

      return Response.json({ paired: false, queueSize: waitingUsers.length })
    }

    if (action === "check") {
      // Check if user has been paired
      const room = chatRooms.find((r) => r.users.includes(userId))
      if (room) {
        return Response.json({
          paired: true,
          roomCode: room.roomCode,
        })
      }

      return Response.json({ paired: false, queueSize: waitingUsers.length })
    }

    return Response.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Queue error:", error)
    return Response.json({ error: "Server error" }, { status: 500 })
  }
}
