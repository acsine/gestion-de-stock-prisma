"use client";
// src/components/auth/SessionTimeoutProvider.tsx
import { useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 heure en millisecondes (3600000 ms)

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Ne configurer les écouteurs d'activité que si l'utilisateur est authentifié
    if (status !== "authenticated" || !session) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const logout = () => {
      console.log("[Sécurité] Session expirée pour inactivité d'une heure. Déconnexion automatique...");
      signOut({ callbackUrl: "/login" });
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    };

    // Événements d'activité utilisateur à écouter
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    // Initialiser le premier timer
    resetTimer();

    // Ajouter les écouteurs d'événements
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Nettoyer les écouteurs à la déconnexion ou au démontage
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [status, session]);

  return <>{children}</>;
}
