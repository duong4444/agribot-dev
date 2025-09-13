import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  // transporter: là đối tượng dùng để kết nối SMTP server và gửi email.
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName?: string) {
    const mailOptions = {
      from: `"AgriBot" <${this.configService.get('SMTP_USER')}>`,
      to: email,
      subject: 'Đặt lại mật khẩu - AgriBot',
      html: this.getPasswordResetEmailTemplate(resetLink, userName || 'User'),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  private getPasswordResetEmailTemplate(resetLink: string, userName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu - AgriBot</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                color: #22c55e;
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .title {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #22c55e;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #16a34a;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }
            .warning {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #92400e;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌱 AgriBot</div>
                <h1 class="title">Đặt lại mật khẩu</h1>
            </div>
            
            <div class="content">
                <p>Xin chào <strong>${userName}</strong>,</p>
                
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AgriBot của bạn.</p>
                
                <p>Để đặt lại mật khẩu, vui lòng nhấp vào nút bên dưới:</p>
                
                <div style="text-align: center;">
                    <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Lưu ý quan trọng:</strong>
                    <ul>
                        <li>Link này chỉ có hiệu lực trong <strong>1 giờ</strong></li>
                        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                        <li>Để bảo mật, không chia sẻ link này với bất kỳ ai</li>
                    </ul>
                </div>
                
                <p>Nếu nút không hoạt động, bạn có thể sao chép và dán link sau vào trình duyệt:</p>
                <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace;">
                    ${resetLink}
                </p>
            </div>
            
            <div class="footer">
                <p>Email này được gửi tự động từ hệ thống AgriBot.</p>
                <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
                <p>© 2025 AgriBot. Tất cả quyền được bảo lưu.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
