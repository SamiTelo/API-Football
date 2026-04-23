import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: number) {
    const [players, teams, positions] = await Promise.all([
      this.prisma.player.count({
        where: { userId },
      }),
      this.prisma.team.count({
        where: { userId },
      }),
      this.prisma.position.count({
        where: { userId },
      }),
    ]);

    return {
      players,
      teams,
      positions,
    };
  }
}
