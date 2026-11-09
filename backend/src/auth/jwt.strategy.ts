import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }
  // Role is re-read from the DB on every request, so demotions apply immediately.
  async validate(payload: { sub: number }) {
    const u = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!u) throw new UnauthorizedException();
    return { id: u.id, role: u.role, email: u.email, name: u.name };
  }
}
