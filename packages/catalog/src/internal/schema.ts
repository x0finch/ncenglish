import { z } from "zod";

export const nceEncodingSchema = z
  .object({
    bookJson: z.string(),
    cover: z.string(),
    audio: z.string(),
    lrc: z.string(),
    unitEntry: z.string(),
  })
  .passthrough();

export const nceBookSchema = z.object({
  key: z.string(),
  title: z.string(),
  mirrorRoot: z.string(),
  bookName: z.string(),
  bookLevel: z.string(),
  coverFile: z.string(),
  units: z.array(z.string()),
});

export const nceIndexSchema = z.object({
  version: z.number(),
  generatedAt: z.string(),
  encoding: nceEncodingSchema,
  books: z.array(nceBookSchema),
});

export type NceEncoding = z.infer<typeof nceEncodingSchema>;
export type NceBook = z.infer<typeof nceBookSchema>;
export type NceIndex = z.infer<typeof nceIndexSchema>;
