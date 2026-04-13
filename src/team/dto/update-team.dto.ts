import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdateTeamDto {
  @ApiProperty({
    description: "le nom de l'equipe",
    example: 'Arsenal',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  name?: string;

  @ApiProperty({
    description: 'le nom du pays',
    example: 'Angleterre',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  country?: string;
}
