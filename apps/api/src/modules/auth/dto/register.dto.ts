import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Nguyễn Văn A',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Họ tên không được quá 50 ký tự' })
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 8,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiProperty({
    description: 'User phone number (Vietnamese format)',
    example: '0123456789',
    required: false,
    pattern: '^(0|\\+84)[0-9]{9,10}$',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @Matches(/^(0|\+84)[0-9]{9,10}$/, { message: 'Số điện thoại Việt Nam không hợp lệ' })
  phoneNumber?: string;
}
