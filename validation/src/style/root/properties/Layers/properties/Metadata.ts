import { z } from 'zod';

export const Metadata = z.record(z.string(), z.any()).optional();
