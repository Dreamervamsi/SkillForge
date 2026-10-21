"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api-config"
import { toast } from "sonner"
import { Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username_or_email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errorMsg) setErrorMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!formData.username_or_email.trim() || !formData.password) {
      setErrorMsg("Please enter both username/email and password.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          const msg = "Rate limit exceeded. Please wait a moment before trying again."
          setErrorMsg(msg)
          toast.error("Rate Limited", { description: msg })
        } else {
          const msg = data.detail || "Invalid username/email or password."
          setErrorMsg(msg)
          toast.error("Authentication Failed", { description: msg })
        }
        return
      }

      // Store JWT token securely in localStorage for API client header inclusion
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token)
        if (data.username) localStorage.setItem("username", data.username)
      }

      toast.success("Welcome back!", {
        description: `Successfully signed in as ${data.username || "User"}.`,
      })

      // Redirect to dashboard or home page
      router.push("/")
    } catch (err) {
      console.error("Login error:", err)
      const msg = "Unable to connect to authentication server. Please try again later."
      setErrorMsg(msg)
      toast.error("Connection Error", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="border-zinc-800/80 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1.5 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
            Sign in to SkillForge
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Enter your credentials to access your skill assessments and roadmaps
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in duration-200">
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username_or_email">Username or Email</Label>
              <Input
                id="username_or_email"
                name="username_or_email"
                type="text"
                placeholder="name@example.com or username"
                value={formData.username_or_email}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/25 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-zinc-800/50 pt-4 pb-6">
          <p className="text-xs text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline transition-colors"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
