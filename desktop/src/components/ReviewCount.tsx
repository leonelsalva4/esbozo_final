import { useEffect, useState } from "react";
import { reviewLabel, reviewRequest } from "../api/reviews";
interface Summary {
  id: string;
  position: number;
  documented: boolean;
  applicable: number | null;
  conforming: number;
}
export function ReviewCount({
  token,
  lotId,
  position,
}: {
  token: string;
  lotId: string;
  position: number | null;
}) {
  const [label, setLabel] = useState("Consultando conformidades…");
  useEffect(() => {
    const controller = new AbortController();
    if (position === null) {
      setLabel("Sin candidata");
      return () => controller.abort();
    }
    setLabel("Consultando conformidades…");
    reviewRequest<Summary[]>(token, `/api/lotes/${lotId}/reviews`, {
      signal: controller.signal,
    })
      .then((rows) => {
        if (!controller.signal.aborted) {
          const row = rows.find((row) => row.position === position);
          setLabel(row ? reviewLabel(row) : "Conformidades no disponibles");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLabel("Conformidades no disponibles");
      });
    return () => controller.abort();
  }, [token, lotId, position]);
  return <small>{label}</small>;
}
