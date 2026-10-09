import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

/** Phase 3 (T-VAL-01): validated rider-assignment body (was raw `@Body("riderId")`). */
export class AssignRiderDto {
  @ApiProperty({ example: "b1111111-1111-4111-8111-111111111111" })
  @IsString({ message: "Rider ID must be a string" })
  @IsNotEmpty({ message: "Rider ID is required" })
  @IsUUID("4", { message: "Invalid rider ID format" })
  riderId: string;
}
