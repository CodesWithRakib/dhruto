import { createZodDto } from 'nestjs-zod';
import {
  addParcelToBagSchema,
  createBagSchema,
  createManifestSchema,
  hubScanSchema,
  receiveManifestSchema,
  resolveExceptionSchema,
  sealBagSchema,
} from '@dhruto/contracts';

export class CreateBagDto extends createZodDto(createBagSchema) {}
export class AddParcelToBagDto extends createZodDto(addParcelToBagSchema) {}
export class SealBagDto extends createZodDto(sealBagSchema) {}
export class CreateManifestDto extends createZodDto(createManifestSchema) {}
export class HubScanDto extends createZodDto(hubScanSchema) {}
export class ReceiveManifestDto extends createZodDto(receiveManifestSchema) {}
export class ResolveExceptionDto extends createZodDto(resolveExceptionSchema) {}
