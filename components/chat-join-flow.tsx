"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSelector } from "./language-selector"
import { ArrowLeft, Users, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChatJoinFlowProps {
  onBack: () => void
  onChatJoined: (chatData: { code: string; language: string; username: string }) => void
}

export function ChatJoinFlow({ onBack, onChatJoined }: ChatJoinFlowProps) {
  const [step, setStep] = useState<"code" | "language" | "username">("code")
  const [chatCode, setChatCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [username, setUsername] = useState("")
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const { toast } = useToast()

  // Simulate chat code validation (in real app, this would be an API call)
  const validateChatCode = async (code: string): Promise<boolean> => {
    setIsValidatingCode(true)
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsValidatingCode(false)

    // For demo purposes, accept any 5-6 character alphanumeric code
    const isValid = /^[A-Z0-9]{5,6}$/.test(code.toUpperCase())
    return isValid
  }

  const handleCodeNext = async () => {
    const trimmedCode = chatCode.trim().toUpperCase()

    if (!trimmedCode) {
      toast({
        title: "Chat Code Required",
        description: "Please enter a chat code to continue.",
        variant: "destructive",
      })
      return
    }

    if (trimmedCode.length < 5 || trimmedCode.length > 6) {
      toast({
        title: "Invalid Code Length",
        description: "Chat codes are 5-6 characters long.",
        variant: "destructive",
      })
      return
    }

    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      toast({
        title: "Invalid Code Format",
        description: "Chat codes contain only letters and numbers.",
        variant: "destructive",
      })
      return
    }

    const isValid = await validateChatCode(trimmedCode)

    if (!isValid) {
      toast({
        title: "Chat Not Found",
        description: "This chat code doesn't exist or has expired.",
        variant: "destructive",
      })
      return
    }

    setChatCode(trimmedCode)
    setStep("language")
  }

  const handleLanguageNext = () => {
    if (!selectedLanguage) {
      toast({
        title: "Language Required",
        description: "Please select your preferred language to continue.",
        variant: "destructive",
      })
      return
    }
    setStep("username")
  }

  const handleUsernameNext = () => {
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username to continue.",
        variant: "destructive",
      })
      return
    }
    if (username.length < 2) {
      toast({
        title: "Username Too Short",
        description: "Username must be at least 2 characters long.",
        variant: "destructive",
      })
      return
    }

    onChatJoined({
      code: chatCode,
      language: selectedLanguage,
      username: username.trim(),
    })
  }

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and limit to 6 characters
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6)
    setChatCode(value)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} className="mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {step === "code" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Join Chat Room
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                Enter the chat code shared with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="chat-code" className="text-foreground font-[var(--font-heading)]">
                  Chat Code
                </Label>
                <Input
                  id="chat-code"
                  type="text"
                  placeholder="Enter 5-6 character code..."
                  value={chatCode}
                  onChange={handleCodeInputChange}
                  className="bg-input border-border text-foreground text-center text-2xl font-mono tracking-wider"
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCodeNext()
                    }
                  }}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{chatCode.length}/6 characters</span>
                  <span className="text-muted-foreground">Letters and numbers only</span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground font-[var(--font-sans)]">
                  <p className="font-semibold text-foreground mb-1">Need a chat code?</p>
                  <p>Ask someone to create a chat room and share their code with you.</p>
                </div>
              </div>

              <Button
                onClick={handleCodeNext}
                disabled={isValidatingCode}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                size="lg"
              >
                {isValidatingCode ? "Validating..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "language" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Select Your Language
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                Choose the language you'll be communicating in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Joining Chat Room</p>
                <p className="text-xl font-bold text-primary font-mono tracking-wider">{chatCode}</p>
              </div>

              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                label="What language do you know?"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("code")}
                  className="flex-1 border-border text-foreground hover:bg-accent"
                >
                  Back
                </Button>
                <Button
                  onClick={handleLanguageNext}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "username" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Choose Username
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                This is how others will see you in the chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Joining Chat Room</p>
                <p className="text-xl font-bold text-primary font-mono tracking-wider">{chatCode}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-[var(--font-heading)]">
                  Enter your username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Your display name..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-input border-border text-foreground"
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUsernameNext()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">{username.length}/20 characters</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-[var(--font-sans)]">Chat Code:</span>
                  <span className="text-foreground font-mono font-semibold">{chatCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-[var(--font-sans)]">Language:</span>
                  <span className="text-foreground font-semibold">{selectedLanguage.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("language")}
                  className="flex-1 border-border text-foreground hover:bg-accent"
                >
                  Back
                </Button>
                <Button
                  onClick={handleUsernameNext}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Join Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
