import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Info')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API base — lists entry points (no auth)' })
  root() {
    return {
      name: 'Finance Dashboard API',
      version: '1.0',
      basePath: '/api/v1',
      docs: '/api/docs',
      hint:
        'Open /api/docs for Swagger. Call POST /api/v1/auth/login, then send Authorization: Bearer with the returned access_token on protected routes.',
    };
  }
}
