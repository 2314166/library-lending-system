import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from './decorators';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Public() @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Public() @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Get('me') me(@CurrentUser() user: AuthUser) { return user; }
}
