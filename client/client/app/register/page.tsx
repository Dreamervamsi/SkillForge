"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth-layout"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
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

    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setErrorMsg("Please fill in all required fields.")
      return
    }

    if (formData.password.length > 72) {
      setErrorMsg("Password cannot exceed 72 characters.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("http://localhost:8000/register", {
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
          const msg = data.detail || "Registration failed. Please check your information."
          setErrorMsg(msg)
          toast.error("Registration Failed", { description: msg })
        }
        return
      }

      // Store JWT token securely in localStorage
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token)
        if (data.username) localStorage.setItem("username", data.username)
      }

      toast.success("Account created successfully!", {
        description: `Welcome to SkillForge AI, ${data.username || "User"}!`,
      })

      // Redirect to home or onboarding
      router.push("/")
    } catch (err) {
      console.error("Register error:", err)
      const msg = "Unable to connect to registration server. Please try again later."
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
            Create your account
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Get started with AI-driven adaptive skill assessments & roadmaps
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="alexdeveloper"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="alex@company.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  autoComplete="new-password"
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
              <p className="text-[11px] text-zinc-500">
                Must be up to 72 characters in length.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/25 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-zinc-800/50 pt-4 pb-6">
          <p className="text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
