import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { Role, TransactionType } from '@prisma/client';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
  ExportTransactionsQueryDto,
} from './transactions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipResponseWrap } from '../../common/decorators/skip-response-wrap.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: '[ALL ROLES] List transactions with filtering, sorting, and pagination',
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'If true, include soft-deleted rows (ADMIN only; ignored for other roles)',
  })
  findAll(
    @Query() query: TransactionQueryDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.transactionsService.findAll(query, user);
  }

  @Get('export')
  @SkipResponseWrap()
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: '[ANALYST, ADMIN] Export transactions as CSV or JSON download',
    description:
      'Returns a file attachment. Supports optional filters: type, category, dateFrom, dateTo (same semantics as list). Soft-deleted rows are excluded.',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Default: csv' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType })
  @ApiProduces('text/csv', 'application/json')
  @ApiResponse({ status: 200, description: 'File stream (CSV or JSON array)' })
  async export(@Query() query: ExportTransactionsQueryDto, @Res() res: Response) {
    const { body, contentType, filename } =
      await this.transactionsService.exportForDownload(query);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  }

  @Get(':id')
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ALL ROLES] Get a single transaction by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: '[ANALYST, ADMIN] Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.transactionsService.create(dto, user.id, { id: user.id, email: user.email });
  }

  @Patch(':id')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: '[ANALYST, ADMIN] Update a transaction (analysts: own records only)',
  })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: { id: string; role: Role; email: string },
  ) {
    return this.transactionsService.update(id, dto, user, {
      id: user.id,
      email: user.email,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Soft-delete a transaction' })
  @ApiParam({ name: 'id', type: String })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role; email: string },
  ) {
    return this.transactionsService.remove(id, user, { id: user.id, email: user.email });
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Restore a soft-deleted transaction' })
  @ApiParam({ name: 'id', type: String })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.transactionsService.restore(id, { id: user.id, email: user.email });
  }
}
