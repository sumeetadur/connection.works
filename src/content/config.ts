import { defineCollection, z } from 'astro:content'

 const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.string(),
    dateRange: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    role: z.string(),
    summary: z.string(),
    nda: z.boolean().default(false),
    highlights: z.array(z.string()).default([]),
    stack: z.array(z.string()).default([]),
    outcomes: z.array(z.string()).default([]),
    media: z
      .array(
        z.object({
          kind: z.enum(['image', 'video']),
          src: z.string().optional(),
          alt: z.string(),
          caption: z.string().optional(),
          tracks: z
            .array(
              z.object({
                src: z.string(),
                srclang: z.string(),
                label: z.string(),
                default: z.boolean().optional(),
              })
            )
            .optional(),
          transcript: z.string().optional(),
        })
      )
      .default([]),
    codeAccess: z
      .object({
        expiresAt: z.string().optional(),
        salt: z.string().optional(),
        kdfIterations: z.number().int().positive().optional(),
        codeHash: z.string().optional(),
        samples: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              language: z.string(),
              iv: z.string(),
              ciphertext: z.string(),
            })
          )
          .default([]),
      })
      .optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          href: z.string().url(),
        })
      )
      .default([]),
  }),
})

export const collections = { projects }
