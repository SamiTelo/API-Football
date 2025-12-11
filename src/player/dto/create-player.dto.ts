import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreatePlayerDto {
  @ApiProperty({
    description: 'le prenom du joueur',
    example: 'cole',
    minLength: 2,
    maxLength: 30,
    required: true,
  })
  @IsString({ message: `le champ doit être une chaine de caractère` })
  @Length(2, 30)
  firstName: string;

  @ApiProperty({
    description: 'le nom du joueur',
    example: 'Palmer',
    required: true,
  })
  @IsString({ message: `le champ doit être une chaine de caractère` })
  lastName: string;

  @ApiProperty({
    description: "l'id de l'equipe",
    example: '2',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  teamId: number;

  @ApiProperty({
    description: "l'id du post",
    example: '3',
    required: true,
  })
  @IsNumber()
  @IsPositive()
  positionId: number;
}
