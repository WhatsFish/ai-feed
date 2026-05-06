import { z } from "zod";

export const LinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const DevelopmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  take: z.string(),
  links: z.array(LinkSchema),
  tags: z.array(z.string()),
});

export const ThemeSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const WorthReadingSchema = z.object({
  label: z.string(),
  url: z.string(),
  why: z.string(),
});

export const RunSchema = z.object({
  run_at: z.string(),
  headline: z.string(),
  developments: z.array(DevelopmentSchema),
  themes: z.array(ThemeSchema),
  worth_reading: z.array(WorthReadingSchema),
  skipped_summary: z.string(),
});

export const StatsSchema = z.object({
  raw_items: z.number(),
  sources_ok: z.number(),
  sources_failed: z.array(z.string()),
});

export const DigestSchema = z.object({
  date: z.string(),
  tz: z.string(),
  runs: z.array(RunSchema),
  stats: StatsSchema,
});

export type Digest = z.infer<typeof DigestSchema>;
export type Run = z.infer<typeof RunSchema>;
export type Development = z.infer<typeof DevelopmentSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type WorthReading = z.infer<typeof WorthReadingSchema>;
