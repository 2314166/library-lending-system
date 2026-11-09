import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim) @IsString() @IsNotEmpty() name: string;
  @Transform(trim) @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
export class LoginDto {
  @Transform(trim) @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
}
