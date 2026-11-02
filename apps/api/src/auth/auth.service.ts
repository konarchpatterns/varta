import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role, AccountStatus } from '@varta/shared';
import { MailjetService } from './mailjet.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RedisService } from '../redis/redis.service';
import {
  SendSignupOtpDto,
  VerifySignupOtpDto,
  SendLoginOtpDto,
  VerifyLoginOtpDto,
} from './dto/otp.dto';
import { GoogleAuthDto } from './dto/google.dto';
import {
  SendPhoneOtpDto,
  VerifyPhoneSignupDto,
  VerifyPhoneLoginDto,
  PhonePasswordLoginDto,
} from './dto/phone.dto';
import { Msg91Service } from './msg91.service';
import { Fast2SmsService } from './fast2sms.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly memoryOtpStore = new Map<
    string,
    { otp: string; attempts: number; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailjetService: MailjetService,
    private readonly redisService: RedisService,
    private readonly msg91Service: Msg91Service,
    private readonly fast2smsService: Fast2SmsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateVerificationToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email, type: 'EMAIL_VERIFICATION' },
      {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'varta_dev_access_secret_super_secure_key_change_in_prod_32chars',
        ),
        expiresIn: '24h',
      },
    );
  }

  private generatePasswordResetToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email, type: 'PASSWORD_RESET' },
      {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'varta_dev_access_secret_super_secure_key_change_in_prod_32chars',
        ),
        expiresIn: '1h',
      },
    );
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      // Return ambiguous success message to prevent user enumeration
      return {
        success: true,
        message: 'If an account exists with this email address, a password reset link has been sent.',
      };
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new BadRequestException('This account has been suspended. Please contact support.');
    }

    const resetToken = this.generatePasswordResetToken(user.id, user.email);
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    await this.mailjetService.sendPasswordResetEmail(
      user.email,
      user.profile?.displayName || user.username,
      resetUrl,
    );

    return {
      success: true,
      message: 'Password reset link has been sent to your email address.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.token) {
      throw new BadRequestException('Password reset token is required');
    }

    try {
      const payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'varta_dev_access_secret_super_secure_key_change_in_prod_32chars',
        ),
      });

      if (payload.type !== 'PASSWORD_RESET') {
        throw new BadRequestException('Invalid password reset token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new NotFoundException('User account not found');
      }

      const passwordHash = await argon2.hash(dto.newPassword, {
        type: argon2.argon2id,
      });

      // Update user password and activate if it was pending verification
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          status: user.status === AccountStatus.PENDING_VERIFICATION ? AccountStatus.ACTIVE : user.status,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      });

      // Invalidate all active sessions for security
      await this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return {
        success: true,
        message: 'Your password has been successfully reset. You can now sign in with your new credentials.',
      };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new BadRequestException('The password reset link has expired. Please request a new one.');
      }
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Password reset link is invalid or expired.');
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email.toLowerCase() },
          { username: dto.username.toLowerCase() },
        ],
      },
      include: { profile: true },
    });

    if (existing) {
      if (existing.email.toLowerCase() === dto.email.toLowerCase()) {
        // If account is still pending verification, resend the activation link
        if (existing.status === AccountStatus.PENDING_VERIFICATION) {
          const token = this.generateVerificationToken(existing.id, existing.email);
          const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
          const verificationUrl = `${appUrl}/verify-email?token=${token}`;
          await this.mailjetService.sendVerificationEmail(
            existing.email,
            existing.profile?.displayName || existing.username,
            verificationUrl,
          );
          return {
            requiresVerification: true,
            message: 'Your account is pending verification. A fresh activation link has been sent to your email.',
            email: existing.email,
          };
        }
        throw new ConflictException('Email is already registered');
      }
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    // Account created in PENDING_VERIFICATION status until email link is clicked
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        passwordHash,
        role: Role.USER,
        status: AccountStatus.PENDING_VERIFICATION,
        isVerified: false,
        profile: {
          create: {
            displayName: dto.displayName.trim(),
          },
        },
        notificationPref: {
          create: {},
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate verification token and send email via Mailjet
    const verificationToken = this.generateVerificationToken(user.id, user.email);
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    await this.mailjetService.sendVerificationEmail(
      user.email,
      user.profile?.displayName || user.username,
      verificationUrl,
    );

    return {
      requiresVerification: true,
      message: 'Account created! Please check your email to activate your account before logging in.',
      email: user.email,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'varta_dev_access_secret_super_secure_key_change_in_prod_32chars',
        ),
      });

      if (payload.type !== 'EMAIL_VERIFICATION') {
        throw new BadRequestException('Invalid verification token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { profile: true },
      });

      if (!user) {
        throw new NotFoundException('User account not found');
      }

      if (user.status === AccountStatus.ACTIVE) {
        return {
          success: true,
          alreadyActive: true,
          message: 'Your account is already active! You can sign in now.',
          email: user.email,
        };
      }

      // Activate user account
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Your account has been successfully activated! You can now sign in.',
        email: user.email,
      };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new BadRequestException('Activation link has expired. Please request a new verification email.');
      }
      throw new BadRequestException(err.message || 'Activation link is invalid or expired.');
    }
  }

  async resendVerification(email: string) {
    if (!email) {
      throw new BadRequestException('Email address is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user) {
      // Prevent user enumeration
      return {
        success: true,
        message: 'If an account exists with this email, a new confirmation link has been sent.',
      };
    }

    if (user.status === AccountStatus.ACTIVE) {
      return {
        success: true,
        alreadyActive: true,
        message: 'Your account is already active. Please sign in.',
      };
    }

    const token = this.generateVerificationToken(user.id, user.email);
    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;

    await this.mailjetService.sendVerificationEmail(
      user.email,
      user.profile?.displayName || user.username,
      verificationUrl,
    );

    return {
      success: true,
      message: 'A fresh activation link has been sent to your email inbox.',
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const identifier = dto.identifier.toLowerCase().trim();
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      user = await this.findUserByPhone(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === AccountStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException(
        'Your account is not active yet. Please click the activation link sent to your email address.',
      );
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active or suspended');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    const hashed = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashed },
      include: { user: { include: { profile: true } } },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Revoke old session (Rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(
      session.user.id,
      session.user.username,
      session.user.email,
      session.user.role,
      userAgent,
      ipAddress,
    );
  }

  async logout(refreshToken: string) {
    const hashed = this.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      isPrivate: user.isPrivate,
      profile: user.profile,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      counts: {
        followers: user._count.followers,
        following: user._count.following,
        posts: user._count.posts,
      },
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(
    userId: string,
    username: string,
    email: string,
    role: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const payload = { sub: userId, username, email, role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')) as any,
      secret: this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'varta_dev_access_secret_super_secure_key_change_in_prod_32chars',
      ),
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 mins in seconds
    };
  }

  // --- OTP HELPERS & ENDPOINTS ---

  private generateNumericOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async saveOtp(key: string, otp: string, ttlSeconds = 600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const record = { otp, attempts: 0, expiresAt };
    this.memoryOtpStore.set(key, record);
    await this.redisService.set(key, JSON.stringify(record), ttlSeconds);
  }

  private async getOtpRecord(
    key: string,
  ): Promise<{ otp: string; attempts: number; expiresAt: number } | null> {
    const redisVal = await this.redisService.get(key);
    if (redisVal) {
      try {
        return JSON.parse(redisVal);
      } catch {
        // fallback to in-memory store
      }
    }
    const mem = this.memoryOtpStore.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      return mem;
    }
    return null;
  }

  private async deleteOtp(key: string): Promise<void> {
    this.memoryOtpStore.delete(key);
    await this.redisService.del(key);
  }

  private maskEmail(email: string): string {
    const [userPart, domain] = email.split('@');
    if (!domain) return email;
    if (userPart.length <= 2) return `${userPart[0]}*@${domain}`;
    const masked =
      userPart[0] +
      '*'.repeat(Math.min(userPart.length - 2, 4)) +
      userPart[userPart.length - 1];
    return `${masked}@${domain}`;
  }

  public normalizePhone(countryCode: string, phoneNumber: string): string {
    const cleanCode = '+' + countryCode.replace(/\D/g, '');
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    return `${cleanCode}${cleanDigits}`;
  }

  public maskPhone(fullPhone: string): string {
    if (!fullPhone) return '';
    const digitsOnly = fullPhone.replace(/\D/g, '');
    if (digitsOnly.length <= 6) return fullPhone;
    const prefix = fullPhone.slice(0, Math.min(5, fullPhone.length - 4));
    const suffix = fullPhone.slice(-3);
    return `${prefix}*****${suffix}`;
  }

  public async findUserByPhone(identifier: string) {
    if (!identifier) return null;
    const rawClean = identifier.replace(/[\s-]/g, '');
    const cleanDigits = identifier.replace(/\D/g, '');
    if (cleanDigits.length < 5) return null;
    const phoneEmail = `${cleanDigits}@phone.varta.in`;

    // 1. Raw query against phoneNumber column
    try {
      const rows = (await this.prisma.$queryRawUnsafe(
        'SELECT id FROM "User" WHERE "phoneNumber" = $1 OR "phoneNumber" = $2 OR "phoneNumber" = $3 LIMIT 1',
        rawClean,
        `+${cleanDigits}`,
        cleanDigits,
      )) as Array<{ id: string }>;
      if (rows && rows.length > 0 && rows[0].id) {
        return this.prisma.user.findUnique({
          where: { id: rows[0].id },
          include: { profile: true },
        });
      }
    } catch {
      // Continue to fallback
    }

    // 2. Mapped phone email or matching username
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: phoneEmail },
          { email: rawClean },
          { username: cleanDigits },
          { username: rawClean },
        ],
      },
      include: { profile: true },
    });
  }

  // 1. Send OTP for Sign Up
  async sendSignupOtp(dto: SendSignupOtpDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.status === AccountStatus.ACTIVE) {
      throw new ConflictException(
        'An active account is already registered with this email. Please sign in instead.',
      );
    }

    const otp = this.generateNumericOtp();
    const key = `otp:signup:${email}`;
    await this.saveOtp(key, otp, 600);

    const displayName = dto.displayName?.trim() || 'Varta Member';
    await this.mailjetService.sendOtpEmail(email, displayName, otp, 'signup');
    this.logger.log(`[OTP] Generated signup OTP for ${email}: ${otp}`);

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${email}`,
      email,
      expiresInSeconds: 600,
    };
  }

  // 2. Verify OTP for Sign Up & Activate/Create Account
  async verifySignupOtp(
    dto: VerifySignupOtpDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const email = dto.email.toLowerCase().trim();
    const key = `otp:signup:${email}`;

    const record = await this.getOtpRecord(key);
    if (!record || record.expiresAt <= Date.now()) {
      throw new BadRequestException(
        'Verification code has expired or is invalid. Please request a new OTP.',
      );
    }

    if (record.attempts >= 5) {
      await this.deleteOtp(key);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    if (record.otp !== dto.otp.trim()) {
      record.attempts += 1;
      const remainingSeconds = Math.max(
        1,
        Math.round((record.expiresAt - Date.now()) / 1000),
      );
      await this.saveOtp(key, record.otp, remainingSeconds);
      throw new BadRequestException(
        'Incorrect verification code. Please check your email and try again.',
      );
    }

    // OTP Verified! Delete OTP from storage
    await this.deleteOtp(key);

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    // Check if pending user exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          profile: {
            update: {
              displayName: dto.displayName.trim(),
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // Ensure unique username
      const usernameExists = await this.prisma.user.findUnique({
        where: { username: dto.username.toLowerCase().trim() },
      });
      if (usernameExists) {
        throw new ConflictException(
          'Username is already taken. Please choose another username.',
        );
      }

      user = await this.prisma.user.create({
        data: {
          email,
          username: dto.username.toLowerCase().trim(),
          passwordHash,
          role: Role.USER,
          status: AccountStatus.ACTIVE,
          isVerified: false,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: dto.displayName.trim(),
            },
          },
          notificationPref: {
            create: {},
          },
        },
        include: { profile: true },
      });
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Account successfully verified and activated!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  // 3. Send OTP for Login
  async sendLoginOtp(dto: SendLoginOtpDto) {
    const identifier = dto.identifier.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: { profile: true },
    });

    if (!user) {
      user = await this.findUserByPhone(identifier);
    }

    if (!user) {
      throw new NotFoundException(
        'No account found with this email, phone, or username.',
      );
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    const otp = this.generateNumericOtp();
    const key = `otp:login:${user.id}`;
    await this.saveOtp(key, otp, 600);

    const displayName = user.profile?.displayName || user.username;
    if (user.email.endsWith('@phone.varta.in')) {
      this.logger.log(`[Phone OTP] Generated login OTP for user ${user.username}: ${otp}`);
      const rawUserPhone = (user as any).phoneNumber || `+${user.email.replace('@phone.varta.in', '')}`;
      await this.msg91Service.sendOtp(rawUserPhone, otp);
    } else {
      await this.mailjetService.sendOtpEmail(user.email, displayName, otp, 'login');
      this.logger.log(`[OTP] Generated login OTP for ${user.email}: ${otp}`);
    }

    const maskedEmail = user.email.endsWith('@phone.varta.in')
      ? this.maskPhone(user.username)
      : this.maskEmail(user.email);

    return {
      success: true,
      message: `A 6-digit sign in code was sent to ${maskedEmail}`,
      maskedEmail,
      expiresInSeconds: 600,
    };
  }

  // 4. Verify OTP for Login & Authenticate User
  async verifyLoginOtp(
    dto: VerifyLoginOtpDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const identifier = dto.identifier.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: { profile: true },
    });

    if (!user) {
      user = await this.findUserByPhone(identifier);
    }

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended.');
    }

    const key = `otp:login:${user.id}`;
    const record = await this.getOtpRecord(key);

    if (!record || record.expiresAt <= Date.now()) {
      throw new BadRequestException(
        'Sign in code has expired or is invalid. Please request a new code.',
      );
    }

    if (record.attempts >= 5) {
      await this.deleteOtp(key);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new sign in code.',
      );
    }

    if (record.otp !== dto.otp.trim()) {
      record.attempts += 1;
      const remainingSeconds = Math.max(
        1,
        Math.round((record.expiresAt - Date.now()) / 1000),
      );
      await this.saveOtp(key, record.otp, remainingSeconds);
      throw new BadRequestException(
        'Incorrect verification code. Please check your email and try again.',
      );
    }

    // OTP verified! Delete OTP
    await this.deleteOtp(key);

    // If account was pending verification, activate it now!
    if (user.status === AccountStatus.PENDING_VERIFICATION) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Signed in successfully!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: AccountStatus.ACTIVE,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  // 5. Sign In or Sign Up with Google Account
  async googleAuth(
    dto: GoogleAuthDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const email = dto.email.toLowerCase().trim();

    // 1. Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      if (user.status === AccountStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact support.',
        );
      }

      // If pending verification, Google email is already verified by Google, so activate it!
      const updateData: any = {};
      if (user.status === AccountStatus.PENDING_VERIFICATION) {
        updateData.status = AccountStatus.ACTIVE;
        updateData.emailVerifiedAt = new Date();
      }

      // If user has no avatar and Google provides one, update it
      if (!user.profile?.avatarUrl && dto.avatarUrl) {
        await this.prisma.userProfile.update({
          where: { userId: user.id },
          data: { avatarUrl: dto.avatarUrl },
        });
      }

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { profile: true },
        });
      }

      this.logger.log(`[Google Auth] User signed in via Google: @${user.username} (${user.email})`);
    } else {
      // 2. User does not exist -> Create account automatically (Sign Up with Google)
      const baseUsername = (dto.displayName || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 18);

      let chosenUsername = baseUsername || 'user';
      let suffix = 1;
      while (
        await this.prisma.user.findUnique({ where: { username: chosenUsername } })
      ) {
        chosenUsername = `${baseUsername.slice(0, 14)}_${suffix++}`;
      }

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await argon2.hash(randomPassword, {
        type: argon2.argon2id,
      });

      user = await this.prisma.user.create({
        data: {
          email,
          username: chosenUsername,
          passwordHash,
          role: Role.USER,
          status: AccountStatus.ACTIVE,
          isVerified: false,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: dto.displayName.trim() || chosenUsername,
              avatarUrl: dto.avatarUrl || null,
            },
          },
          notificationPref: {
            create: {},
          },
        },
        include: { profile: true },
      });

      this.logger.log(
        `[Google Auth] Created new user account via Google: @${user.username} (${user.email})`,
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Signed in with Google successfully!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  // 6. Generate Google OAuth 2.0 Authorization URL
  getGoogleAuthUrl(): { url: string; isConfigured: boolean } {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/v1/auth/google/callback';

    if (
      !clientId ||
      clientId.trim() === '' ||
      clientId.includes('your-google-client-id')
    ) {
      return {
        url: '',
        isConfigured: false,
      };
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: callbackUrl,
      client_id: clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent select_account',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };
    const qs = new URLSearchParams(options);
    return {
      url: `${rootUrl}?${qs.toString()}`,
      isConfigured: true,
    };
  }

  // 7. Handle Google OAuth 2.0 Authorization Callback
  async handleGoogleCallback(
    code: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl =
      this.configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3001/api/v1/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth credentials are not fully configured in .env',
      );
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const bodyParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      this.logger.error(`[Google OAuth] Token exchange error: ${errBody}`);
      throw new BadRequestException(
        'Failed to exchange authorization code with Google',
      );
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const googleAccessToken = tokenData.access_token;

    const userinfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      },
    );

    if (!userinfoRes.ok) {
      throw new BadRequestException(
        'Failed to retrieve Google user profile information',
      );
    }

    const googleUser = (await userinfoRes.json()) as {
      email: string;
      name?: string;
      picture?: string;
      sub?: string;
    };

    return this.googleAuth(
      {
        email: googleUser.email,
        displayName: googleUser.name || googleUser.email.split('@')[0],
        avatarUrl: googleUser.picture,
        googleId: googleUser.sub,
      },
      userAgent,
      ipAddress,
    );
  }

  // --- PHONE AUTHENTICATION FLOWS ---

  // 1. Send OTP for Phone Sign Up / Login
  async sendPhoneOtp(dto: SendPhoneOtpDto) {
    const fullPhone = this.normalizePhone(dto.countryCode, dto.phoneNumber);
    const cleanDigits = fullPhone.replace(/\D/g, '');

    if (cleanDigits.length < 7) {
      throw new BadRequestException('Please enter a valid phone number');
    }

    const existingUser = await this.findUserByPhone(fullPhone);

    if (dto.purpose === 'signup') {
      if (existingUser && existingUser.status === AccountStatus.ACTIVE) {
        throw new ConflictException(
          'An account is already registered with this phone number. Please sign in instead.',
        );
      }
    } else {
      // login
      if (!existingUser) {
        throw new NotFoundException(
          'No account found with this phone number. Please check the number or sign up.',
        );
      }
      if (existingUser.status === AccountStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your account has been suspended. Please contact support.',
        );
      }
    }

    const otp = this.generateNumericOtp();
    const key = `otp:phone:${fullPhone}`;
    await this.saveOtp(key, otp, 600);

    this.logger.log(
      `[Phone OTP] Generated ${dto.purpose} OTP for ${fullPhone}: ${otp}`,
    );

    // Dispatch SMS via Fast2SMS (instant India delivery without DLT) or MSG91
    let smsResult: { success: boolean; simulated?: boolean; message: string } = {
      success: false,
      simulated: true,
      message: '',
    };

    if (this.fast2smsService.isConfigured()) {
      const f2Result = await this.fast2smsService.sendOtp(fullPhone, otp);
      if (f2Result.success) {
        smsResult = f2Result;
      } else {
        this.logger.warn(`[SMS] Fast2SMS dispatch failed (${f2Result.message}), trying MSG91...`);
        smsResult = await this.msg91Service.sendOtp(fullPhone, otp);
      }
    } else {
      smsResult = await this.msg91Service.sendOtp(fullPhone, otp);
    }

    const masked = this.maskPhone(fullPhone);

    // No SMS provider configured → do not pretend the code was sent. The OTP is
    // in the server log and in the response when DEV_OTP_EXPOSE=true.
    if (!smsResult.success) {
      const expose = this.configService.get<string>('DEV_OTP_EXPOSE') === 'true';
      this.logger.warn(
        `[Phone OTP] SMS not sent for ${masked}: ${smsResult.message}. Code: ${otp}`,
      );
      return {
        success: true,
        message: expose
          ? `SMS gateway not configured — demo mode. Use code ${otp} for ${masked}.`
          : `SMS could not be sent to ${masked} (gateway not configured on the server). Check the server log for the code.`,
        phone: fullPhone,
        countryCode: dto.countryCode,
        isSmsConfigured: false,
        devOtp: expose ? otp : undefined,
        expiresInSeconds: 600,
      };
    }

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${masked}`,
      phone: fullPhone,
      countryCode: dto.countryCode,
      isSmsConfigured: true,
      expiresInSeconds: 600,
    };
  }

  // 2. Verify Phone OTP & Register Account
  async verifyPhoneSignup(
    dto: VerifyPhoneSignupDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const fullPhone = this.normalizePhone(dto.countryCode, dto.phoneNumber);
    const key = `otp:phone:${fullPhone}`;

    const record = await this.getOtpRecord(key);
    if (!record || record.expiresAt <= Date.now()) {
      throw new BadRequestException(
        'Verification code has expired or is invalid. Please request a new OTP.',
      );
    }

    if (record.attempts >= 5) {
      await this.deleteOtp(key);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    if (record.otp !== dto.otp.trim()) {
      record.attempts += 1;
      const remainingSeconds = Math.max(
        1,
        Math.round((record.expiresAt - Date.now()) / 1000),
      );
      await this.saveOtp(key, record.otp, remainingSeconds);
      throw new BadRequestException(
        'Incorrect verification code. Please check your SMS and try again.',
      );
    }

    // OTP Verified! Remove from storage
    await this.deleteOtp(key);

    const cleanDigits = fullPhone.replace(/\D/g, '');
    const phoneEmail = `${cleanDigits}@phone.varta.in`;
    const username = dto.username.toLowerCase().trim();

    // Check username collision
    const usernameExists = await this.prisma.user.findUnique({
      where: { username },
    });
    if (usernameExists) {
      throw new ConflictException(
        'Username is already taken. Please choose another username.',
      );
    }

    // Check existing phone
    const existingUser = await this.findUserByPhone(fullPhone);
    if (existingUser && existingUser.status === AccountStatus.ACTIVE) {
      throw new ConflictException(
        'An account is already registered with this phone number. Please sign in instead.',
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    let user;
    if (existingUser) {
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username,
          passwordHash,
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          profile: {
            update: {
              displayName: dto.displayName.trim(),
            },
          },
        },
        include: { profile: true },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: phoneEmail,
          username,
          passwordHash,
          role: Role.USER,
          status: AccountStatus.ACTIVE,
          isVerified: false,
          emailVerifiedAt: new Date(),
          profile: {
            create: {
              displayName: dto.displayName.trim(),
            },
          },
          notificationPref: {
            create: {},
          },
        },
        include: { profile: true },
      });
    }

    // Persist phone details on User
    try {
      await this.prisma.$executeRawUnsafe(
        'UPDATE "User" SET "phoneNumber" = $1, "phoneCountryCode" = $2 WHERE id = $3',
        fullPhone,
        dto.countryCode,
        user.id,
      );
    } catch (e: any) {
      this.logger.warn(`Could not set phoneNumber in raw query: ${e.message}`);
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Account successfully registered and phone verified!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phoneNumber: fullPhone,
        phoneCountryCode: dto.countryCode,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  // 3. Verify Phone OTP & Log In User
  async verifyPhoneLogin(
    dto: VerifyPhoneLoginDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const fullPhone = this.normalizePhone(dto.countryCode, dto.phoneNumber);
    const key = `otp:phone:${fullPhone}`;

    const record = await this.getOtpRecord(key);
    if (!record || record.expiresAt <= Date.now()) {
      throw new BadRequestException(
        'Verification code has expired or is invalid. Please request a new OTP.',
      );
    }

    if (record.attempts >= 5) {
      await this.deleteOtp(key);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    if (record.otp !== dto.otp.trim()) {
      record.attempts += 1;
      const remainingSeconds = Math.max(
        1,
        Math.round((record.expiresAt - Date.now()) / 1000),
      );
      await this.saveOtp(key, record.otp, remainingSeconds);
      throw new BadRequestException(
        'Incorrect verification code. Please check your SMS and try again.',
      );
    }

    await this.deleteOtp(key);

    const user = await this.findUserByPhone(fullPhone);
    if (!user) {
      throw new NotFoundException(
        'No account found with this phone number. Please sign up first.',
      );
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Signed in successfully via Phone OTP!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phoneNumber: fullPhone,
        phoneCountryCode: dto.countryCode,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }

  // 4. Log in with Phone & Password
  async phonePasswordLogin(
    dto: PhonePasswordLoginDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const fullPhone = this.normalizePhone(dto.countryCode, dto.phoneNumber);
    const user = await this.findUserByPhone(fullPhone);

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      success: true,
      message: 'Signed in successfully!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        phoneNumber: fullPhone,
        phoneCountryCode: dto.countryCode,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        profile: user.profile,
      },
      ...tokens,
    };
  }
}


