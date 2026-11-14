declare module "virtual:zhumoben/questions" {
  import type { ComponentType } from "react";
  import type { QuestionMeta } from "../../shared/types";

  export const questions: Array<{
    meta: QuestionMeta;
    load: () => Promise<{
      default: ComponentType;
      frontmatter: Record<string, unknown>;
    }>;
  }>;
}

declare module "virtual:zhumoben/config" {
  import type { KitConfig } from "../../shared/types";
  export const config: KitConfig;
}

declare module "*.css";
