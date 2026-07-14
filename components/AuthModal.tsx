"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { LogIn, LogOut, X, Shield, Lock, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function AuthModal({ isOpen, onClose, user }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Failed to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } catch (err: any) {
      setError("Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-sm p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition cursor-pointer p-2"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-8">
          <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-sm flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-sky-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 font-sans">
            {user ? "Cloud Vault Active" : "Sign In to Cloud Vault"}
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-sm">
            {user
              ? "You are securely authenticated. Your 3D models are safe."
              : "Enable real-time synchronization, project versioning, and secure backups."}
          </p>
        </div>

        {/* User Stats/Status */}
        {user ? (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-sm flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Avatar"}
                  className="w-12 h-12 rounded-sm border border-slate-700"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-800 text-sky-400 flex items-center justify-center rounded-sm font-bold text-lg">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {user.displayName || "Studio Creator"}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate mt-1">
                  {user.email}
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 font-sans text-sm py-3 px-4 rounded-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-4 rounded-sm font-mono text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-sans text-sm py-3 px-4 rounded-sm shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Authenticating..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-2 justify-center text-xs text-slate-500 font-mono pt-4 border-t border-slate-800">
              <Shield className="w-4 h-4" />
              <span>Secured by Firebase</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}