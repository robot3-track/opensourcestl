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
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Neon decorative background element */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-12 h-12 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-sky-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 font-sans">
            {user ? "Cloud Vault Active" : "Sign In to Cloud Vault"}
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-[280px]">
            {user
              ? "You are securely authenticated. Your 3D models are safe."
              : "Enable real-time synchronisation, project versioning, and secure backups."}
          </p>
        </div>

        {/* User Stats/Status */}
        {user ? (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Avatar"}
                  className="w-10 h-10 rounded-full border border-sky-500/30"
                />
              ) : (
                <div className="w-10 h-10 bg-sky-500/20 text-sky-400 flex items-center justify-center rounded-full font-bold">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {user.displayName || "Studio Creator"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {user.email}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-slate-100 font-sans text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Sign Out from Studio
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl font-mono text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-sans text-xs py-2.5 px-4 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Authenticating..." : "Continue with Google Secure"}
            </button>

            <div className="flex items-center gap-2 justify-center text-[10px] text-slate-500 font-mono pt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>POWERED BY FIREBASE SECURE AUTHENTICATION</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
