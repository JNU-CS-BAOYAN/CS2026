import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const experiences = defineCollection({
  loader: glob({ base: './src/content/experiences', pattern: '**/index.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().trim().min(1),
      author: z.string().trim().min(1),
      applicationYear: z.number().int().min(2000).max(2100),
      undergraduateMajor: z.string().trim().min(1).optional(),
      institutions: z.array(z.string().trim().min(1)).default([]),
      cover: image().optional(),
      finalDestination: z.string().optional(),
      sourceUrl: z.url().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      heading: z.string().optional(),
      intro: z.string().optional(),
      description: z.string().optional(),
      image: image().optional(),
    }),
});

export const collections = { experiences, pages };

