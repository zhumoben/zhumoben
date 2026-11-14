import type { Tone } from "../../../shared/types";
import { kitConfig } from "../lib/config";

export function Tag({ name }: { name: string }) {
  const meta = kitConfig.tags?.[name];
  const tone = (meta?.color ?? "gray") as Tone;
  return (
    <span className="tag" data-tone={tone}>
      {meta?.label ?? name}
    </span>
  );
}
