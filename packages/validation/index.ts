import { z } from 'zod';

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const ReportSubmissionSchema = z.object({
  latitude: z.preprocess((val) => Number(val), z.number().min(-90).max(90)),
  longitude: z.preprocess((val) => Number(val), z.number().min(-180).max(180)),
  categorySuggested: z.string().optional(),
  description: z.string().min(5).max(1000)
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
