"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socket-client"
import { LanguageSelector } from "@/components/language-selector"

interface OneOnOneChatFlowProps {
  onBack: () => void
  onPaired: (data: { code: string; language: string; username: string; isOneOnOne: boolean }) => void
}

export function OneOnOneChatFlow({ onBack, onPaired }: OneOnOneChatFlowProps) {
  const [step, setStep] = useState<"language" | "searching" | "timeout">("language")
  const [language, setLanguage] = useState("English")
  const [username] = useState(`User${Math.floor(Math.random() * 1000)}`)
  const [searchTime, setSearchTime] = useState(0)
  const { toast } = useToast()

  const handleLanguageSelect = (selectedLanguage: string) => {
    setLanguage(selectedLanguage)
    setStep("searching")

    if (typeof window !== "undefined") {
      const socket = getSocket()
      console.log("[v0] Joining queue with:", { language: selectedLanguage, username })
      socket.emit("joinQueue", { language: selectedLanguage, username })
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || step !== "searching") return

    const socket = getSocket()

    socket.on("paired", (roomId) => {
      console.log("[v0] 🎉 Pairing successful! Room:", roomId)
      console.log("[v0] Room ID type:", typeof roomId)

      toast({
        title: "Match Found!",
        description: "Connected with your chat partner!",
      })

      setTimeout(() => {
        onPaired({
          code: roomId,
          language,
          username,
          isOneOnOne: true,
        })
      }, 500)
    })

    socket.on("queueStatus", (data) => {
      console.log("[v0] Queue status update:", data)
    })

    socket.on("connect_error", (error) => {
      console.log("[v0] ❌ Socket connection error:", error)
    })

    socket.on("disconnect", (reason) => {
      console.log("[v0] 🔌 Socket disconnected:", reason)
    })

    return () => {
      console.log("[v0] Cleaning up socket listeners")
      socket.off("paired")
      socket.off("queueStatus")
      socket.off("connect_error")
      socket.off("disconnect")
    }
  }, [language, username, onPaired, toast, step])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (step === "searching") {
      interval = setInterval(() => {
        setSearchTime((prev) => {
          const newTime = prev + 1
          console.log("[v0] Search time:", newTime)

          if (newTime >= 60) {
            handleTimeout()
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [step])

  const handleTimeout = () => {
    setStep("timeout")
    toast({
      title: "No Match Found",
      description: "No one was available for chat. Try again later when more people are online!",
      variant: "destructive",
    })
  }

  const handleCancel = () => {
    console.log("[v0] User cancelled 1-1 chat search")
    onBack()
  }

  const handleRetry = () => {
    setStep("searching")
    setSearchTime(0)

    if (typeof window !== "undefined") {
      const socket = getSocket()
      console.log("[v0] Retrying queue join with:", { language, username })
      socket.emit("joinQueue", { language, username })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (step === "language") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Heart className="w-12 h-12 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Choose Your Language</h1>
            <p className="text-gray-300">
              Select your preferred language for the chat. Messages will be automatically translated!
            </p>
          </div>

          <div className="space-y-4">
            <LanguageSelector selectedLanguage={language} onLanguageChange={handleLanguageSelect} showLabel={false} />
          </div>

          <Button
            variant="outline"
            onClick={onBack}
            className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  if (step === "timeout") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">No One Found</h1>
            <p className="text-gray-300">
              We couldn't find anyone to chat with after 60 seconds. Try again later when more people are online!
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
              <Heart className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
            <Heart className="w-12 h-12 text-yellow-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-white">Finding Your Match</h1>
          <p className="text-gray-300">Searching for someone to chat with in {language}...</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
            <span className="text-sm text-gray-300">Looking for available users</span>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-white">Language: {language}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span>{formatTime(searchTime)}</span>
                <span className="text-red-400">({60 - searchTime}s left)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-500"></div>
              <span className="text-sm text-white">Username: {username}</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-1000"></div>
              <span className="text-sm text-white">Connected via Socket.io</span>
            </div>
          </div>

          <div className="text-sm text-yellow-400 animate-pulse">Waiting for match...</div>
        </div>

        <Button
          variant="outline"
          onClick={handleCancel}
          className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          Cancel & Go Back
        </Button>
      </div>
    </div>
  )
}
