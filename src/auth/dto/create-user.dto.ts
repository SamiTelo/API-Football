import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsOptional, IsNumber, IsPositive } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: `Nom de l'utilisateur`,
    example: `Telo`,
    required: true,
  })
  @IsString({ message: `le nom doit être une chaine de caractère` })
  @IsNotEmpty({ message: `Nom requis pour s'inscrire` })
  lastName: string;

  @ApiProperty({
    description: `Prenom  de l'utilisateur`,
    example: `Samuel`,
    required: true,
  })
  @IsNotEmpty({ message: `Prenom requis pour s'inscrire` })
  @IsString({ message: `le prenom doit être une chaine de caractère` })
  firstName: string;

  @ApiProperty({
    description: `Adresse email  de l'utilisateur`,
    example: `telo@gmail.com`,
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

  @ApiProperty({ example: 'ADMIN', required: false })
  @IsString()
  role?: string; // 🔹 ajouter cette ligne

  @ApiProperty({ example: '2' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  roleId?: number;
}
