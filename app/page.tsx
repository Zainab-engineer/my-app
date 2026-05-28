"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login03() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/documents");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-xs">
          <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
            Welcome to Consul
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your credentials to access your account.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <Label
                htmlFor="username"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Username
              </Label>
              <Input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="mt-2"
                autoFocus
              />
            </div>
            <div>
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Password
              </Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="**************"
                autoComplete="current-password"
                className="mt-2"
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button type="submit" disabled={loading} className="mt-4 w-full py-2 font-medium">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
