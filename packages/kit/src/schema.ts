import { z } from "zod";
import type { Scorecard } from "../shared/types.js";

const toneSchema = z.enum(["accent", "amber", "gray", "red"]);

export const scoreItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  max: z.number().int().positive(),
  fullCredit: z.string().optional(),
});

export const scoreGroupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(scoreItemSchema).min(1),
});

export const bandSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().min(0),
  label: z.string().min(1),
  tone: toneSchema.default("gray"),
});

export const scorecardSchema = z
  .object({
    version: z.literal(1),
    max: z.number().int().positive(),
    groups: z.array(scoreGroupSchema).min(1),
    bands: z.array(bandSchema).min(1),
  })
  .superRefine((card, ctx) => {
    const seen = new Set<string>();
    let sum = 0;

    for (const group of card.groups) {
      for (const item of group.items) {
        if (seen.has(item.id)) {
          ctx.addIssue({
            code: "custom",
            message: `duplicate score item id "${item.id}"`,
          });
        }
        seen.add(item.id);
        sum += item.max;
      }
    }

    if (sum !== card.max) {
      ctx.addIssue({
        code: "custom",
        message: `items add up to ${sum}, but "max" is ${card.max}`,
      });
    }

    const bands = [...card.bands].sort((a, b) => a.min - b.min);
    let cursor = 0;
    for (const band of bands) {
      if (band.min !== cursor) {
        ctx.addIssue({
          code: "custom",
          message: `bands must cover 0..${card.max} without gaps: expected a band starting at ${cursor}, found ${band.min}`,
        });
        return;
      }
      cursor = band.max + 1;
    }
    if (cursor !== card.max + 1) {
      ctx.addIssue({
        code: "custom",
        message: `bands must cover 0..${card.max}: coverage stops at ${cursor - 1}`,
      });
    }
  });

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  level: z.string().optional(),
  levelLabel: z.string().optional(),
  duration: z.string().optional(),
  stack: z.string().optional(),
  format: z.string().optional(),
  tags: z.array(z.string()).default([]),
  summary: z.string().optional(),
});

export type ValidScorecard = Scorecard;

export function parseScorecard(raw: unknown): Scorecard {
  const result = scorecardSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  · ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`invalid scorecard:\n${detail}`);
  }
  return result.data as Scorecard;
}

export function parseFrontmatter(raw: unknown): z.infer<typeof frontmatterSchema> {
  const result = frontmatterSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  · ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`invalid question frontmatter:\n${detail}`);
  }
  return result.data;
}
