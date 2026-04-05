import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Role, TransactionType } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: '[ALL ROLES] Overall financial summary: totals, net balance, savings rate',
  })
  @ApiResponse({ status: 200, description: 'Financial summary returned' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('categories')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Breakdown of totals by category' })
  @ApiQuery({ name: 'type', enum: TransactionType, required: false })
  getCategoryBreakdown(@Query('type') type?: TransactionType) {
    return this.dashboardService.getCategoryBreakdown(type);
  }

  @Get('trends/monthly')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Monthly income vs expense trends for a given year' })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2024 })
  getMonthlyTrends(
    @Query('year') year?: string,
  ) {
    return this.dashboardService.getMonthlyTrends(year ? Number(year) : undefined);
  }

  @Get('trends/weekly')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Weekly trends for the last N weeks' })
  @ApiQuery({ name: 'weeks', required: false, type: Number, example: 8 })
  getWeeklyTrends(@Query('weeks') weeks?: string) {
    return this.dashboardService.getWeeklyTrends(weeks ? Number(weeks) : 8);
  }

  @Get('recent')
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ALL ROLES] Most recent transactions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentActivity(limit ? Number(limit) : 10);
  }

  @Get('ratio')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Income vs expense ratio' })
  getIncomeExpenseRatio() {
    return this.dashboardService.getIncomeExpenseRatio();
  }

  @Get('top-categories')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Top N spending/earning categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  getTopCategories(@Query('limit') limit?: string) {
    return this.dashboardService.getTopCategories(limit ? Number(limit) : 5);
  }

  @Get('health-score')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: '[ANALYST, ADMIN] Financial health score (0–100) with breakdown and tips',
    description:
      'Computes savings rate, expense consistency (last 3 months), income diversity, housing cost ratio, and month-over-month trend from non-deleted transactions.',
  })
  @ApiResponse({ status: 200, description: 'Score, grade, per-dimension breakdown, and tips' })
  getHealthScore() {
    return this.dashboardService.getHealthScore();
  }
}
