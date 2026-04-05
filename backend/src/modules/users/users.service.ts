import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from './users.dto';
import { paginate } from '../../common/dto/pagination.dto';
import { AuditService, type AuditPerformer } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(query: UserQueryDto) {
    const { role, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users, total, Number(page), Number(limit));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { transactions: true } },
      },
    });

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);
    return user;
  }

  async create(dto: CreateUserDto, performer: AuditPerformer) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email is already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
      },
    });
    this.auditService.log('CREATE', 'user', user.id, performer, {
      email: user.email,
      role: user.role,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string) {
    await this.findOne(id);

    if (dto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (emailTaken) throw new ConflictException('Email is already in use');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    requesterId: string,
    performer: AuditPerformer,
  ) {
    // Prevent admin from demoting themselves
    if (id === requesterId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const existing = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true, name: true, email: true, role: true, status: true, updatedAt: true,
      },
    });
    this.auditService.log('UPDATE', 'user', id, performer, {
      previousRole: existing.role,
      newRole: dto.role,
    });
    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    requesterId: string,
    performer: AuditPerformer,
  ) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    const existing = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true, name: true, email: true, role: true, status: true, updatedAt: true,
      },
    });
    this.auditService.log('UPDATE', 'user', id, performer, {
      previousStatus: existing.status,
      newStatus: dto.status,
    });
    return updated;
  }

  async remove(id: string, requesterId: string, performer: AuditPerformer) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const existing = await this.findOne(id);
    const txCount = await this.prisma.transaction.count({ where: { userId: id } });
    if (txCount > 0) {
      throw new ConflictException(
        `Cannot delete user. They have ${txCount} transaction(s) on record. Deactivate the account instead to preserve financial history.`,
      );
    }
    await this.prisma.user.delete({ where: { id } });
    this.auditService.log('DELETE', 'user', id, performer, { email: existing.email });
    return { message: 'User deleted successfully' };
  }
}
