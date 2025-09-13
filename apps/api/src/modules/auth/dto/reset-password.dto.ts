import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token là bắt buộc' })
  @IsNotEmpty({ message: 'Token là bắt buộc' })
  token: string;

  @IsString({ message: 'Mật khẩu mới là bắt buộc' })
  @IsNotEmpty({ message: 'Mật khẩu mới là bắt buộc' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  newPassword: string;
}
