import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: "le nom de l'equipe",
    example: 'Arsenal',
  })
  @IsString({ message: `Le nom doit être une chaine de caractère` })
  @Length(2, 30, { message: `Le champ doit contenir entre 2 et 30 caractères` })
  name!: string;

  @ApiProperty({
    description: 'le nom du pays',
    example: 'Angleterre',
    required: false,
  })
  @IsOptional()
  @IsString({ message: `Le nom doit être une chaine de caractère` })
  @MinLength(3, { message: `Le champ  doit contenir au moins 3 caractères` })
  country?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  cloudinaryLogoId?: string;
}
