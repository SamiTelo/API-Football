import { Controller, Get, Res } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import type { Response } from 'express';

@Controller('metrics')
export class PrometheusController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get()
  async metrics(@Res() res: Response) {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    return res.send(await this.prometheus.metrics());
  }
}
