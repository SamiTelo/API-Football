import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: `Adresse email  de l'utilisateur`,
    example: `example@gmail.com`,
    required: true,
  })
  @IsNotEmpty({ message: `Email requis pour s'inscrire` })
  @IsString({ message: `l'email doit être une chaine de caractère` })
  @IsEmail({}, { message: 'Email invalide' })
  @Matches(/^[^{};,!%µ*$#[\]()]+$/, {
    message: 'Certains caractères sont interdits',
  })
  email: string;

  @ApiProperty({
    description: `Mot de passe  de l'utilisateur`,
    example: `Abcd1234`,
    minLength: 8,
    required: true,
  })
  @IsNotEmpty({ message: `mot de passe requis pour s'inscrire` })
  @IsString({ message: `le mot de passe doit être une chaine de caractère` })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    //(?=.*[a-z]) → au moins une minuscule
    //(?=.*[A-Z]) → au moins une majuscule
    //(?=.*\d) → au moins un chiffre
    //.{8,} → longueur minimum 8
    message:
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
  })
  password: string;
}
