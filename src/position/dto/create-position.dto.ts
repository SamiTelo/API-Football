import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({
    description: 'le nom du post',
    example: 'Gardien de but',
    minLength: 2,
    maxLength: 30,
    required: true,
  })
  @IsString({ message: `Le nom doit être une chaîne de caractères` })
  @Length(2, 30, { message: `Le nom doit contenir entre 2 et 30 caractères` })
  name: string;
}
