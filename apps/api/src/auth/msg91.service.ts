import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Msg91SendOtpResult {
  success: boolean;
  message: string;
  simulated?: boolean;
  requestId?: string;
}

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  constructor(private readonly configService: ConfigService) {}

  public isConfigured(): boolean {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY')?.trim();
    const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID')?.trim();
    return !!(authKey && templateId);
  }

  /**
   * Send 6-digit OTP via MSG91 API v5
   * @param fullPhone Full international phone number (e.g. +919023789034)
   * @param otp 6-digit verification code
   */
  async sendOtp(fullPhone: string, otp: string): Promise<Msg91SendOtpResult> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY')?.trim();
    const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID')?.trim();

    // MSG91 expects mobile number as digits with country code, without '+' (e.g. 919023789034)
    const mobileDigits = fullPhone.replace(/\D/g, '');

    if (!authKey || !templateId) {
      this.logger.warn(
        `[MSG91] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is missing in .env. ` +
        `Simulating SMS delivery for ${fullPhone}. Security code: ${otp}`,
      );
      // Not configured: the OTP is only in the server log. Never report success,
      // otherwise the app tells the user "code sent" and they wait for an SMS
      // that will never arrive.
      return {
        success: false,
        simulated: true,
        message:
          'SMS gateway is not configured on the server (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID or FAST2SMS_API_KEY missing)',
      };
    }

    try {
      const url = new URL('https://control.msg91.com/api/v5/otp');
      url.searchParams.set('template_id', templateId);
      url.searchParams.set('mobile', mobileDigits);
      url.searchParams.set('authkey', authKey);
      url.searchParams.set('otp', otp);
      url.searchParams.set('otp_expiry', '10'); // 10 minutes expiry

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify({ otp }),
      });

      const responseData = (await response.json()) as {
        type?: string;
        message?: string;
        request_id?: string;
      };

      if (!response.ok || responseData.type === 'error') {
        const errorMsg = responseData.message || response.statusText;
        this.logger.error(`[MSG91] Failed to dispatch SMS to ${fullPhone}: ${errorMsg}`);
        return {
          success: false,
          message: `MSG91 SMS Gateway error: ${errorMsg}`,
        };
      }

      this.logger.log(
        `[MSG91] Successfully sent SMS OTP to ${fullPhone} (Request ID: ${responseData.request_id || 'N/A'})`,
      );

      return {
        success: true,
        requestId: responseData.request_id,
        message: 'SMS OTP dispatched successfully via MSG91',
      };
    } catch (err: any) {
      this.logger.error(`[MSG91] Network exception sending SMS to ${fullPhone}: ${err.message}`);
      return {
        success: false,
        message: `Failed to connect to MSG91 SMS gateway: ${err.message}`,
      };
    }
  }

  /**
   * Resend OTP via MSG91
   */
  async retryOtp(fullPhone: string, retryType: 'text' | 'voice' = 'text'): Promise<Msg91SendOtpResult> {
    const authKey = this.configService.get<string>('MSG91_AUTH_KEY')?.trim();
    const mobileDigits = fullPhone.replace(/\D/g, '');

    if (!authKey) {
      return { success: false, simulated: true, message: 'MSG91 not configured' };
    }

    try {
      const url = new URL('https://control.msg91.com/api/v5/otp/retry');
      url.searchParams.set('authkey', authKey);
      url.searchParams.set('mobile', mobileDigits);
      url.searchParams.set('retrytype', retryType);

      const response = await fetch(url.toString(), { method: 'GET' });
      const data = (await response.json()) as { type?: string; message?: string };

      if (!response.ok || data.type === 'error') {
        return { success: false, message: data.message || 'Retry failed' };
      }

      return { success: true, message: 'OTP resent via MSG91' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}
