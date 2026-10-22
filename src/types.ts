import { z } from 'zod';

export const degreeEnum = z.enum(['S', 'A', 'B', 'C', 'D', 'N/A']);

const stringOrNumber = z.union([z.string(), z.number()]);
const nullableStringOrNumber = z.union([z.string(), z.number(), z.null()]);

export const zzerDetailSchema = z.object({
  id: stringOrNumber.optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  productName: z.string().optional(),
  product_name: z.string().optional(),
  price: nullableStringOrNumber.optional(),
  salePrice: nullableStringOrNumber.optional(),
  currentPrice: nullableStringOrNumber.optional(),
  sellingPrice: nullableStringOrNumber.optional(),
  priceCny: nullableStringOrNumber.optional(),
  originalPrice: nullableStringOrNumber.optional(),
  original_price: nullableStringOrNumber.optional(),
  originalPriceCny: nullableStringOrNumber.optional(),
  marketPrice: nullableStringOrNumber.optional(),
  retailPrice: nullableStringOrNumber.optional(),
  discount: nullableStringOrNumber.optional(),
  discountRate: nullableStringOrNumber.optional(),
  discountPercent: nullableStringOrNumber.optional(),
  sku: z.string().optional(),
  itemNo: z.string().optional(),
  articleNumber: z.string().optional(),
  categoryName: z.string().optional(),
  cateName: z.string().optional(),
  firstCategoryName: z.string().optional(),
  categoryMain: z.string().optional(),
  categorySub: z.string().optional(),
  category: z.string().optional(),
  degreeDesc: nullableStringOrNumber.optional(),
  degree: nullableStringOrNumber.optional(),
  condition: nullableStringOrNumber.optional(),
  degreeExt: z.string().optional(),
  degreeExtEn: z.string().optional(),
  storeLocation: z.string().optional(),
  warehouseCode: z.string().optional(),
  storeText: z.string().optional(),
  storeTextEn: z.string().optional(),
  locationWarehouse: z.string().optional(),
  sellerName: z.string().optional(),
  shopName: z.string().optional(),
  vendor: z.string().optional(),
  brand: z.union([z.string(), z.null()]).optional(),
  imageList: z.array(z.unknown()).optional(),
  imageListV1: z.array(z.unknown()).optional(),
  photos: z.array(z.unknown()).optional(),
  images: z.array(z.unknown()).optional(),
  flawList: z.array(z.unknown()).optional(),
  defectList: z.array(z.unknown()).optional(),
  flawInfo: z.array(z.unknown()).optional(),
  defectInfo: z.array(z.unknown()).optional(),
  flawDesc: z.string().optional(),
  defectDesc: z.string().optional(),
  identifyReportModuleV2: z.unknown().optional(),
  identify_report_module_v2: z.unknown().optional(),
  authCertificateUrl: z.string().optional(),
  certificateUrl: z.string().optional(),
  auth_certificate_url: z.string().optional(),
}).passthrough();

export const zzerBrandSchema = z.union([
  z.string(),
  z.object({ name: z.string().optional() }).passthrough(),
]);

export const zzerApiResponseSchema = z.object({
  code: stringOrNumber.optional(),
  msg: z.string().optional(),
  message: z.string().optional(),
  data: z.object({
    detail: zzerDetailSchema.optional(),
    brand: zzerBrandSchema.nullable().optional(),
  }).passthrough().optional(),
}).passthrough();

export type ZzerDetail = z.infer<typeof zzerDetailSchema>;
export type ZzerApiResponse = z.infer<typeof zzerApiResponseSchema>;
export type DegreeGrade = z.infer<typeof degreeEnum>;

export const productRecordSchema = z.object({
  item_id: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().default('Unknown'),
  price: z.number().nonnegative(),
  original_price: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  sku: z.string().default(''),
  category: z.string().default(''),
  flaws: z.array(z.string()).default([]),
  store_location: z.string().default(''),
  seller_name: z.string().default(''),
  degree_ext: z.string().default(''),
  auth_certificate_url: z.string().url().nullable().default(null),
  condition_grade: degreeEnum,
  images: z.array(z.string().url()).default([]),
  source_url: z.string().url(),
  captured_at: z.string().datetime(),
  raw_degree: z.string().optional(),
  raw_response_path: z.string().optional(),
  product_details: z.record(z.string(), z.unknown()).default({}),
  raw_payload: z.record(z.string(), z.unknown()).default({}),
});

export type ProductRecord = z.infer<typeof productRecordSchema>;
