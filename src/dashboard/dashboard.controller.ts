import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: JwtUser) {
    return this.dashboardService.getStats(user.sub);
  }
}
