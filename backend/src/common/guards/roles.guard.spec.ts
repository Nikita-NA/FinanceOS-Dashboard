import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';

const mockReflector = { getAllAndOverride: jest.fn() };

function createMockContext(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as any);
    jest.clearAllMocks();
  });

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const ctx = createMockContext({ role: Role.VIEWER });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext({ role: Role.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has one of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ANALYST, Role.ADMIN]);
    const ctx = createMockContext({ role: Role.ANALYST });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext({ role: Role.VIEWER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is missing from request', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const ctx = createMockContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
