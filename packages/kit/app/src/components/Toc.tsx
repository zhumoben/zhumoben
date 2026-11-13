import { useEffect, useState } from "react";
import type { Chapter } from "../../../shared/types";

export function Toc({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");

  useEffect(() => {
    const nodes = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!nodes.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-12% 0px -74% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <nav className="toc" aria-label="目录">
      <p className="toc__label">Contents</p>
      <ol>
        {chapters.map((chapter, index) => (
          <li key={chapter.id}>
            <button
              type="button"
              className={active === chapter.id ? "is-active" : undefined}
              onClick={() => {
                document.getElementById(chapter.id)?.scrollIntoView({ block: "start" });
              }}
            >
              <span className="n">{String(index + 1).padStart(2, "0")}</span>
              {chapter.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
