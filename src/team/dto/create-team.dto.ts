import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: "le nom de l'equipe",
    example: 'Arsenal',
    minLength: 2,
    maxLength: 30,
    required: true,
  })
  @IsString({ message: `Le nom doit être une chaine de caractère` })
  @Length(2, 30, { message: `Le champ doit contenir entre 2 et 30 caractères` })
  name: string;

  @ApiProperty({
    description: 'le nom du pays',
    example: 'Angleterre',
    minLength: 3,
    required: true,
  })
  @IsString({ message: `Le nom doit être une chaine de caractère` })
  @MinLength(3, { message: `Le champ  doit contenir au moins 3 caractères` })
  country: string;
}
