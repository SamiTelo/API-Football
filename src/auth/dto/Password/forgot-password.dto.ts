import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;
}
