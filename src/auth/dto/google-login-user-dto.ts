import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: `Token d'identification Google obtenu côté frontend`,
    example: `eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...`,
    required: true,
  })
  @IsNotEmpty({ message: 'Le token Google est requis' })
  @IsString({ message: 'Le token doit être une chaîne de caractères' })
  idToken!: string;
}
