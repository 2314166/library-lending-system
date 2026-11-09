import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');
    // Self-registration is always MEMBER. Librarians come from seed data only.
    const user = await this.prisma.user.create({
      data: { name: dto.name, email, passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user);
  }

  private issue(u: User) {
    return {
      accessToken: this.jwt.sign({ sub: u.id, role: u.role }),
      user: { id: u.id, name: u.name, email: u.email, role: u.role },
    };
  }
}
