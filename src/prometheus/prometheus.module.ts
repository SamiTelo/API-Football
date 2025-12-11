import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusService } from './prometheus.service';
import { PrometheusController } from './prometheus.controller';
import { PrometheusInterceptor } from './prometheus.interceptor';

@Module({
  providers: [
    PrometheusService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrometheusInterceptor,
    },
  ],
  controllers: [PrometheusController],
  exports: [PrometheusService],
})
export class PrometheusModule {}
