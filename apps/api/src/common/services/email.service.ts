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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --brand-primary: #22c55e;
                --brand-secondary: #16a34a;
                --light-bg: #f9fafb;
                --light-container: #ffffff;
                --light-text: #111827;
                --light-text-secondary: #4b5563;
                --light-border: #e5e7eb;
                --dark-bg: #0d1117;
                --dark-container: #161b22;
                --dark-text: #e6edf3;
                --dark-text-secondary: #8b949e;
                --dark-border: #30363d;
            }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: var(--light-bg);
                color: var(--light-text);
            }
            .wrapper {
                max-width: 600px;
                margin: 0 auto;
            }
            .container {
                background-color: var(--light-container);
                padding: 30px;
                border-radius: 12px;
                border: 1px solid var(--light-border);
            }
            .header {
                text-align: center;
                margin-bottom: 24px;
                padding-bottom: 24px;
                border-bottom: 1px solid var(--light-border);
            }
            .logo {
                color: var(--brand-primary);
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }
            .title {
                font-size: 24px;
                font-weight: 600;
                margin: 0;
            }
            .content p {
                margin: 0 0 16px;
            }
            .button-wrapper {
                text-align: center;
                margin: 32px 0;
            }
            .button {
                display: inline-block;
                background: linear-gradient(to right, #34d399, #22c55e);
                color: white !important; /* Important for dark mode */
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                border: none;
                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);
                transition: all 0.3s ease;
            }
            .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3);
            }
            .link-wrapper {
                word-break: break-all;
                background-color: #f3f4f6;
                padding: 12px;
                border-radius: 8px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 14px;
            }
            .footer {
                margin-top: 32px;
                font-size: 14px;
                color: var(--light-text-secondary);
                text-align: center;
            }
            /* Dark Mode Styles */
            @media (prefers-color-scheme: dark) {
                body {
                    background-color: var(--dark-bg);
                    color: var(--dark-text);
                }
                .container {
                    background-color: var(--dark-container);
                    border-color: var(--dark-border);
                }
                .header {
                    border-color: var(--dark-border);
                }
                .footer {
                    color: var(--dark-text-secondary);
                }
                .link-wrapper {
                    background-color: #21262d;
                    color: var(--dark-text-secondary);
                }
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo">🌱 AgriBot</div>
                    <h1 class="title">Yêu cầu đặt lại mật khẩu</h1>
                </div>
                
                <div class="content">
                    <p>Xin chào <strong>${userName}</strong>,</p>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản AgriBot của bạn. Để hoàn tất, vui lòng nhấp vào nút bên dưới.</p>
                    
                    <div class="button-wrapper">
                        <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
                    </div>
                    
                    <p>Liên kết này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này một cách an toàn.</p>
                    
                    <p>Nếu gặp sự cố với nút bấm, hãy sao chép và dán liên kết sau vào trình duyệt của bạn:</p>
                    <p class="link-wrapper">${resetLink}</p>
                </div>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} AgriBot. All rights reserved.</p>
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
