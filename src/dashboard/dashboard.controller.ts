import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtUser } from 'src/auth/types/jwt-payload.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: JwtUser) {
    return this.dashboardService.getStats(user.sub);
  }
}
