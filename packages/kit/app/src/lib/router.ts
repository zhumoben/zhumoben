import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "bank" }
  | { name: "records"; question?: string }
  | { name: "question"; id: string; record?: string };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean);
  const query = new URLSearchParams(queryPart);

  if (parts[0] === "q" && parts[1]) {
    return {
      name: "question",
      id: decodeURIComponent(parts[1]),
      record: query.get("record") ?? undefined,
    };
  }
  if (parts[0] === "bank") return { name: "bank" };
  if (parts[0] === "records") {
    return { name: "records", question: query.get("question") ?? undefined };
  }
  return { name: "home" };
}

export function navigate(to: string): void {
  const next = to.startsWith("#") ? to : `#${to}`;
  if (location.hash === next) return;
  location.hash = next;
}

export function questionHref(id: string, record?: string): string {
  const base = `/q/${encodeURIComponent(id)}`;
  return record ? `${base}?record=${encodeURIComponent(record)}` : base;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
