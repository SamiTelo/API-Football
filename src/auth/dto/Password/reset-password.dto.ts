import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Le token de réinitialisation est requis' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
  })
  newPassword: string;
}
