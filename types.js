import { z } from 'zod';
export const degreeEnum = z.enum(['A', 'B', 'C', 'D', 'N/A']);
export const zzerDetailSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    price: z.union([z.string(), z.number()]).optional(),
    degreeDesc: z.union([z.string(), z.number(), z.null()]).optional(),
    degree: z.union([z.string(), z.number(), z.null()]).optional(),
    condition: z.union([z.string(), z.number(), z.null()]).optional(),
    imageList: z.array(z.union([z.string(), z.null()])).optional(),
}).passthrough();
export const zzerBrandSchema = z.object({
    name: z.string().optional(),
}).passthrough();
export const zzerApiResponseSchema = z.object({
    data: z.object({
        detail: zzerDetailSchema.optional(),
        brand: zzerBrandSchema.optional(),
    }).passthrough().optional(),
}).passthrough();
export const productRecordSchema = z.object({
    item_id: z.string().min(1),
    title: z.string().min(1),
    brand: z.string().default('Unknown'),
    price: z.number().nonnegative(),
    condition_grade: degreeEnum,
    images: z.array(z.string().url()).default([]),
    source_url: z.string().url(),
    captured_at: z.string().datetime(),
    raw_degree: z.string().optional(),
    raw_response_path: z.string().optional(),
});
