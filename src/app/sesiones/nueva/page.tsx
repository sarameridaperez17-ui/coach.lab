"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSessions, createSession } from "@/lib/api";

// Crea una sesión en blanco y redirige directamente a su editor — igual que
// "Nueva tarea", no hay paso intermedio: se entra ya al documento a construir.
export default function NuevaSesionPage() {
  const router = useRouter();
  const creating = useRef(false);

  useEffect(() => {
    if (creating.current) return;
    creating.current = true;
    getSessions()
      .then((existing) =>
        createSession({
          name: `Sesión ${existing.length + 1}`,
          session_date: new Date().toISOString().slice(0, 10),
          status: "planificada",
        })
      )
      .then((created) => router.replace(`/sesiones/${created.id}`))
      .catch((err) => {
        console.error("Error al crear la sesión:", err);
        router.replace("/sesiones");
      });
  }, [router]);

  return <div className="text-muted text-sm">Creando sesión…</div>;
}
