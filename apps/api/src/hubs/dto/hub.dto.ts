import { createZodDto } from "nestjs-zod";
import {
  createBagSchema,
  addParcelToBagSchema,
  sealBagSchema,
  createManifestSchema,
  hubScanSchema,
} from "@dhruto/contracts";

export class CreateBagDto extends createZodDto(createBagSchema) {}
export class AddParcelToBagDto extends createZodDto(addParcelToBagSchema) {}
export class SealBagDto extends createZodDto(sealBagSchema) {}
export class CreateManifestDto extends createZodDto(createManifestSchema) {}
export class HubScanDto extends createZodDto(hubScanSchema) {}
