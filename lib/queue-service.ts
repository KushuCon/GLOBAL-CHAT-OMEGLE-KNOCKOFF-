interface QueueUser {
  id: string
  username: string
  language: string
  timestamp: number
}

interface QueueMessage {
  type:
    | "QUEUE_JOIN"
    | "QUEUE_LEAVE"
    | "QUEUE_PAIRED"
    | "QUEUE_STATE_REQUEST"
    | "QUEUE_STATE_RESPONSE"
    | "PAIRING_TIMEOUT"
  userId?: string
  user?: QueueUser
  pairedWith?: string
  pairCode?: string
  queue?: QueueUser[]
}

class QueueService {
  private channel: BroadcastChannel | null = null
  private currentUser: QueueUser | null = null
  private queue: QueueUser[] = []
  private onPairedCallback: ((pairCode: string, partnerUser: QueueUser) => void) | null = null
  private onQueueUpdateCallback: ((queueSize: number) => void) | null = null
  private readonly QUEUE_STORAGE_KEY = "multilingual-chat-queue"

  constructor() {
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("queue-channel")
      this.channel.onmessage = this.handleMessage.bind(this)

      this.loadQueueFromStorage()
      window.addEventListener("storage", this.handleStorageChange.bind(this))

      this.requestQueueState()
    }
  }

  private handleMessage(event: MessageEvent<QueueMessage>) {
    const message = event.data
    console.log("[v0] Queue message received:", message.type, message)

    switch (message.type) {
      case "QUEUE_JOIN":
        if (message.user && message.userId !== this.currentUser?.id) {
          console.log("[v0] Adding user to queue:", message.user)
          this.addToQueue(message.user)
          this.broadcastQueueState()
        }
        break

      case "QUEUE_LEAVE":
        if (message.userId) {
          this.removeFromQueue(message.userId)
          this.broadcastQueueState()
        }
        break

      case "QUEUE_PAIRED":
        console.log("[v0] Processing QUEUE_PAIRED message:", message)
        console.log("[v0] Current user ID:", this.currentUser?.id)
        console.log("[v0] Message userId:", message.userId)
        console.log("[v0] Message pairedWith:", message.pairedWith)

        let partner: QueueUser | null = null
        let shouldTriggerCallback = false

        if (message.userId === this.currentUser?.id && message.pairCode && message.pairedWith) {
          partner = this.queue.find((u) => u.id === message.pairedWith) || null
          shouldTriggerCallback = true
          console.log("[v0] Current user is user1, partner:", partner?.username)
        } else if (message.pairedWith === this.currentUser?.id && message.pairCode && message.userId) {
          partner = this.queue.find((u) => u.id === message.userId) || null
          shouldTriggerCallback = true
          console.log("[v0] Current user is user2, partner:", partner?.username)
        }

        if (shouldTriggerCallback && partner && this.onPairedCallback) {
          console.log("[v0] 🎉 Triggering onPaired callback with code:", message.pairCode)
          this.onPairedCallback(message.pairCode, partner)
          this.cleanup()
        }

        if (message.userId && message.pairedWith) {
          this.removeFromQueue(message.userId)
          this.removeFromQueue(message.pairedWith)
        }
        break

      case "QUEUE_STATE_REQUEST":
        this.broadcastMessage({
          type: "QUEUE_STATE_RESPONSE",
          queue: this.queue,
        })
        break

      case "QUEUE_STATE_RESPONSE":
        if (message.queue) {
          this.mergeQueueState(message.queue)
        }
        break
    }
  }

  private addToQueue(user: QueueUser) {
    if (!this.queue.find((u) => u.id === user.id)) {
      this.queue.push(user)
      this.queue.sort((a, b) => a.timestamp - b.timestamp)
      console.log(
        "[v0] Queue updated, size:",
        this.queue.length,
        "users:",
        this.queue.map((u) => u.username),
      )
      this.saveQueueToStorage()
      this.notifyQueueUpdate()
      this.tryPairing()
    }
  }

  private removeFromQueue(userId: string) {
    const initialLength = this.queue.length
    this.queue = this.queue.filter((u) => u.id !== userId)
    if (this.queue.length !== initialLength) {
      this.saveQueueToStorage()
      this.notifyQueueUpdate()
    }
  }

  private tryPairing() {
    console.log("[v0] === PAIRING ATTEMPT START ===")
    console.log("[v0] Queue size:", this.queue.length)

    if (this.queue.length < 2) {
      console.log("[v0] ❌ Not enough users for pairing - need 2, have", this.queue.length)
      return
    }

    const user1 = this.queue[0]
    const user2 = this.queue[1]

    const sortedUsers = [user1, user2].sort((a, b) => a.id.localeCompare(b.id))
    const combinedData = `${sortedUsers[0].username}-${sortedUsers[1].username}-${Math.min(sortedUsers[0].timestamp, sortedUsers[1].timestamp)}`
    const pairCode = `1v1-${combinedData
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 12)}`

    console.log("[v0] ✅ PAIRING USERS!")
    console.log("[v0] User 1:", user1.username, user1.id)
    console.log("[v0] User 2:", user2.username, user2.id)
    console.log("[v0] 🔑 PAIR CODE:", pairCode)

    this.broadcastMessage({
      type: "QUEUE_PAIRED",
      userId: user1.id,
      pairedWith: user2.id,
      pairCode,
    })

    console.log("[v0] === PAIRING ATTEMPT END ===")
  }

  private mergeQueueState(incomingQueue: QueueUser[]) {
    const existingUsers = new Map(this.queue.map((user) => [user.id, user]))

    let hasChanges = false
    for (const user of incomingQueue) {
      if (!existingUsers.has(user.id)) {
        this.queue.push(user)
        hasChanges = true
      }
    }

    if (hasChanges) {
      this.queue.sort((a, b) => a.timestamp - b.timestamp)
      console.log(
        "[v0] Merged queue state, size:",
        this.queue.length,
        "users:",
        this.queue.map((u) => u.username),
      )
      this.notifyQueueUpdate()
    }
  }

  private broadcastMessage(message: QueueMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message)
      } catch (error) {
        console.error("[v0] Failed to broadcast queue message:", error)
      }
    }
  }

  private notifyQueueUpdate() {
    if (this.onQueueUpdateCallback) {
      this.onQueueUpdateCallback(this.queue.length)
    }
  }

  private loadQueueFromStorage() {
    try {
      const storedQueue = localStorage.getItem(this.QUEUE_STORAGE_KEY)
      if (storedQueue) {
        const parsedQueue = JSON.parse(storedQueue)
        const now = Date.now()
        this.queue = parsedQueue.filter((user: QueueUser) => now - user.timestamp < 5 * 60 * 1000)
        console.log("[v0] Loaded queue from storage:", this.queue.length, "users")
        this.notifyQueueUpdate()
      }
    } catch (error) {
      console.error("[v0] Failed to load queue from storage:", error)
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
      console.log("[v0] Saved queue to storage:", this.queue.length, "users")
    } catch (error) {
      console.error("[v0] Failed to save queue to storage:", error)
    }
  }

  private handleStorageChange(event: StorageEvent) {
    if (event.key === this.QUEUE_STORAGE_KEY && event.newValue) {
      try {
        const newQueue = JSON.parse(event.newValue)
        console.log("[v0] Queue updated from storage:", newQueue.length, "users")
        this.queue = newQueue
        this.notifyQueueUpdate()
      } catch (error) {
        console.error("[v0] Failed to parse queue from storage:", error)
      }
    }
  }

  private broadcastQueueState() {
    this.broadcastMessage({
      type: "QUEUE_STATE_RESPONSE",
      queue: this.queue,
    })
  }

  private requestQueueState() {
    if (this.channel) {
      this.broadcastMessage({
        type: "QUEUE_STATE_REQUEST",
      })
    }
  }

  joinQueue(username: string, language: string): string {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    console.log("[v0] Joining queue:", username, language, userId)

    this.currentUser = {
      id: userId,
      username,
      language,
      timestamp: Date.now(),
    }

    this.addToQueue(this.currentUser)

    this.broadcastQueueState()

    this.broadcastMessage({
      type: "QUEUE_JOIN",
      userId,
      user: this.currentUser,
    })

    return userId
  }

  leaveQueue() {
    if (this.currentUser) {
      this.broadcastMessage({
        type: "QUEUE_LEAVE",
        userId: this.currentUser.id,
      })

      this.removeFromQueue(this.currentUser.id)
      this.currentUser = null
    }
  }

  onPaired(callback: (pairCode: string, partnerUser: QueueUser) => void) {
    this.onPairedCallback = callback
  }

  onQueueUpdate(callback: (queueSize: number) => void) {
    this.onQueueUpdateCallback = callback
  }

  getQueueSize(): number {
    return this.queue.length
  }

  getCurrentUser(): QueueUser | null {
    return this.currentUser
  }

  cleanup() {
    this.currentUser = null
    this.onPairedCallback = null
    this.onQueueUpdateCallback = null
  }

  destroy() {
    this.leaveQueue()

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageChange.bind(this))
    }

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
  }
}

export const queueService = new QueueService()
