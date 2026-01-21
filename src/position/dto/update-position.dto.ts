import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdatePositionDto {
  @ApiProperty({
    description: 'le nom du post',
    example: 'Gardien de but',
    minLength: 2,
    maxLength: 30,
  })
  @IsString({ message: `Le nom doit être une chaîne de caractères` })
  @Length(2, 30, { message: `Le nom doit contenir entre 2 et 30 caractères` })
  @IsOptional()
  name: string;
}
