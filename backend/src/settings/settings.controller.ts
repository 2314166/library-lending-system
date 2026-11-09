import { Body, Controller, Get, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { SettingsService } from './settings.service';

@Roles(Role.LIBRARIAN)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}
  @Get() get() { return this.settings.all(); }
  @Put() put(@Body() body: Record<string, unknown>) { return this.settings.update(body); }
}
