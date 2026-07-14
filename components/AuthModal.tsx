"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { LogIn, LogOut, X, Shield, Lock, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function AuthModal({ isOpen, onClose, user }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecuritySpecs, setShowSecuritySpecs] = useState(false);

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
      setError(err.message || "Authentication transmission failure.");
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
      setError("Sign out command execution failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none">
      <div className="relative w-full max-w-sm bg-[#080d19] border border-slate-900 rounded-sm p-5 shadow-2xl text-slate-100">
        
        {/* Close Command */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 transition cursor-pointer"
          title="Close Overlay"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Block */}
        <div className="flex items-start gap-3 pb-4 border-b border-slate-900 mb-4">
          <div className="w-8 h-8 bg-[#050811] border border-slate-800 rounded-sm flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {user ? "SESSION_ACTIVE" : "AUTHENTICATION_REQUIRED"}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-tight">
              {user ? "Cloud token validated successfully" : "Establish secure identity verification"}
            </p>
          </div>
        </div>

        {/* Dynamic State Management Interface */}
        {user ? (
          <div className="space-y-3">
            <div className="bg-[#050811] border border-slate-900 p-3 rounded-sm flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Operator"}
                  className="w-8 h-8 rounded-sm border border-slate-800 grayscale contrast-125"
                />
              ) : (
                <div className="w-8 h-8 bg-slate-900 text-slate-400 flex items-center justify-center rounded-sm text-xs font-bold border border-slate-800">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-300 truncate uppercase">
                  {user.displayName || "OPERATOR_DEFAULT"}
                </p>
                <p className="text-[9px] text-slate-500 truncate lowercase">
                  {user.email}
                </p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-[#050811] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-rose-400 font-bold text-[10px] uppercase py-2 px-3 rounded-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Terminate Workspace Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 text-[10px] p-2.5 rounded-sm text-center uppercase tracking-tight">
                ERR: {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-bold text-xs py-2 px-4 rounded-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-500" />
              {loading ? "PROCESSING..." : "INITIALIZE GOOGLE AUTH"}
            </button>
          </div>
        )}

        {/* Collapsible Panel to Prevent Overcrowding */}
        <div className="mt-3 border-t border-slate-900 pt-1">
          <button
            onClick={() => setShowSecuritySpecs(!showSecuritySpecs)}
            className="w-full py-2 flex items-center justify-between text-[9px] text-slate-500 hover:text-slate-400 uppercase font-bold tracking-wider"
          >
            <span>Security Matrix &amp; Terms</span>
            {showSecuritySpecs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          
          {showSecuritySpecs && (
            <div className="bg-[#050811] border border-slate-950 p-2.5 rounded-sm text-[9px] text-slate-600 space-y-1.5 leading-normal uppercase">
              <div className="flex items-start gap-1.5">
                <Shield className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                <span>Synchronized asset parameters utilize TLS encryption standards for real-time model state saving.</span>
              </div>
              <p>Unauthorized deployment or tampering with network tokens terminates geometric workspace synchronization pipelines automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}