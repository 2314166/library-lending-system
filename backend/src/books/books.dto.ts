import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBookDto {
  @Transform(trim) @IsString() @IsNotEmpty({ message: 'title is required' }) title: string;
  @Transform(trim) @IsString() @IsNotEmpty({ message: 'author is required' }) author: string;
  @IsOptional() @Transform(trim) @IsString() genre?: string;
  @IsInt() @Min(0, { message: 'totalCopies cannot be negative' }) totalCopies: number;
}
export class UpdateBookDto extends PartialType(CreateBookDto) {}
