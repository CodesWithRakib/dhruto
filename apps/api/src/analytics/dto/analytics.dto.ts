import { createZodDto } from 'nestjs-zod';
import { analyticsQuerySchema } from '@dhruto/contracts';

export class AnalyticsQueryDto extends createZodDto(analyticsQuerySchema) {}
