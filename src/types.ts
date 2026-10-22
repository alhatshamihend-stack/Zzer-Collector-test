import { z } from 'zod';

export const degreeEnum = z.enum(['S', 'A', 'B', 'C', 'D', 'N/A']);

const nullableStringOrNumber = z.union([z.string(), z.number(), z.null()]);
const optionalText = nullableStringOrNumber.optional();
const optionalArray = z.array(z.unknown()).nullable().optional();

export const zzerDetailSchema = z.object({
  id: optionalText,
  name: optionalText,
  title: optionalText,
  productName: optionalText,
  product_name: optionalText,
  price: optionalText,
  salePrice: optionalText,
  currentPrice: optionalText,
  sellingPrice: optionalText,
  priceCny: optionalText,
  originalPrice: optionalText,
  original_price: optionalText,
  originalPriceCny: optionalText,
  marketPrice: optionalText,
  retailPrice: optionalText,
  discount: optionalText,
  discountRate: optionalText,
  discountPercent: optionalText,
  sku: optionalText,
  itemNo: optionalText,
  articleNumber: optionalText,
  categoryName: optionalText,
  cateName: optionalText,
  firstCategoryName: optionalText,
  categoryMain: optionalText,
  categorySub: optionalText,
  category: optionalText,
  degreeDesc: optionalText,
  degree: optionalText,
  condition: optionalText,
  degreeExt: optionalText,
  degreeExtEn: optionalText,
  storeLocation: optionalText,
  warehouseCode: optionalText,
  storeText: optionalText,
  storeTextEn: optionalText,
  locationWarehouse: optionalText,
  sellerName: optionalText,
  shopName: optionalText,
  vendor: optionalText,
  brand: z.union([z.string(), z.null()]).optional(),
  imageList: optionalArray,
  imageListV1: optionalArray,
  photos: optionalArray,
  images: optionalArray,
  flawList: optionalArray,
  defectList: optionalArray,
  flawInfo: optionalArray,
  defectInfo: optionalArray,
  flawDesc: optionalText,
  defectDesc: optionalText,
  identifyReportModuleV2: z.unknown().optional(),
  identify_report_module_v2: z.unknown().optional(),
  authCertificateUrl: optionalText,
  certificateUrl: optionalText,
  auth_certificate_url: optionalText,
}).passthrough();

export const zzerBrandSchema = z.union([
  z.string(),
  z.object({ name: optionalText }).passthrough(),
]);

export const zzerApiResponseSchema = z.object({
  code: nullableStringOrNumber.optional(),
  msg: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  data: z.object({
    detail: zzerDetailSchema.nullable().optional(),
    brand: zzerBrandSchema.nullable().optional(),
  }).passthrough().nullable().optional(),
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
