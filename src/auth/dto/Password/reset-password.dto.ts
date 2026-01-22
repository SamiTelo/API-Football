import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: `Token de réinitialisation  mot de passe`,
    example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`,
    required: true,
  })
  @IsNotEmpty({ message: 'Le token de réinitialisation est requis' })
  token: string;

  @ApiProperty({
    description: `Entre votre nouveau mot de passe`,
    example: `Abcd1234`,
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
  })
  newPassword: string;
}
