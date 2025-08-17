export class Simple1v1Queue {
  private channel: BroadcastChannel
  private currentUser: { id: string; username: string } | null = null
  private onPairedCallback: ((roomCode: string) => void) | null = null
  private isInQueue = false

  constructor() {
    this.channel = new BroadcastChannel("1v1-queue")
    this.setupMessageHandling()
  }

  private setupMessageHandling() {
    this.channel.addEventListener("message", (event) => {
      const { type, data } = event.data
      console.log("[v0] Received message:", type, data)

      switch (type) {
        case "USER_JOINED":
          this.handleUserJoined(data)
          break
        case "PAIRING_SUCCESS":
          this.handlePairingSuccess(data)
          break
        case "QUEUE_REQUEST":
          this.respondToQueueRequest()
          break
        case "QUEUE_RESPONSE":
          this.handleQueueResponse(data)
          break
      }
    })
  }

  private getQueue(): Array<{ id: string; username: string; timestamp: number }> {
    const stored = localStorage.getItem("1v1-queue")
    return stored ? JSON.parse(stored) : []
  }

  private setQueue(queue: Array<{ id: string; username: string; timestamp: number }>) {
    localStorage.setItem("1v1-queue", JSON.stringify(queue))
  }

  private handleUserJoined(userData: { id: string; username: string }) {
    if (!this.currentUser || userData.id === this.currentUser.id) return

    console.log("[v0] Another user joined, attempting to pair")
    this.attemptPairing()
  }

  private handleQueueResponse(data: { queue: Array<{ id: string; username: string; timestamp: number }> }) {
    console.log("[v0] Received queue response:", data.queue.length, "users")
    if (data.queue.length >= 2 && this.currentUser) {
      this.attemptPairing()
    }
  }

  private respondToQueueRequest() {
    if (this.isInQueue && this.currentUser) {
      const queue = this.getQueue()
      this.channel.postMessage({
        type: "QUEUE_RESPONSE",
        data: { queue },
      })
    }
  }

  private attemptPairing() {
    if (!this.currentUser || !this.isInQueue) return

    const queue = this.getQueue()
    console.log("[v0] Attempting pairing with queue size:", queue.length)

    if (queue.length >= 2) {
      // Take first 2 users from queue
      const [user1, user2] = queue.slice(0, 2)
      const roomCode = `1v1-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

      console.log("[v0] Pairing users:", user1.username, "and", user2.username, "with room:", roomCode)

      // Remove paired users from queue
      const newQueue = queue.slice(2)
      this.setQueue(newQueue)

      // Notify both users about pairing
      this.channel.postMessage({
        type: "PAIRING_SUCCESS",
        data: { roomCode, user1: user1.id, user2: user2.id },
      })

      // If current user is one of the paired users, trigger callback
      if (this.currentUser.id === user1.id || this.currentUser.id === user2.id) {
        this.handlePairingSuccess({ roomCode, user1: user1.id, user2: user2.id })
      }
    }
  }

  private handlePairingSuccess(data: { roomCode: string; user1: string; user2: string }) {
    if (!this.currentUser) return

    if (this.currentUser.id === data.user1 || this.currentUser.id === data.user2) {
      console.log("[v0] Current user was paired! Room:", data.roomCode)
      this.isInQueue = false

      if (this.onPairedCallback) {
        this.onPairedCallback(data.roomCode)
      }
    }
  }

  joinQueue(username: string, onPaired: (roomCode: string) => void) {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    this.currentUser = { id: userId, username }
    this.onPairedCallback = onPaired
    this.isInQueue = true

    console.log("[v0] Joining queue as:", username, "with ID:", userId)

    // Add to queue
    const queue = this.getQueue()
    queue.push({ id: userId, username, timestamp: Date.now() })
    this.setQueue(queue)

    // Notify other tabs
    this.channel.postMessage({
      type: "USER_JOINED",
      data: { id: userId, username },
    })

    // Request current queue state from other tabs
    this.channel.postMessage({
      type: "QUEUE_REQUEST",
      data: {},
    })

    // Attempt immediate pairing
    setTimeout(() => this.attemptPairing(), 100)
  }

  leaveQueue() {
    if (!this.currentUser) return

    console.log("[v0] Leaving queue")

    const queue = this.getQueue()
    const newQueue = queue.filter((user) => user.id !== this.currentUser!.id)
    this.setQueue(newQueue)

    this.isInQueue = false
    this.currentUser = null
    this.onPairedCallback = null
  }

  getQueueSize(): number {
    return this.getQueue().length
  }

  cleanup() {
    this.leaveQueue()
    this.channel.close()
  }
}
