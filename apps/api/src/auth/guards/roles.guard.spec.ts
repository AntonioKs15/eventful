import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@eventful/contracts';
import { RolesGuard } from './roles.guard';

function createContext(userRole: UserRole | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when the route declares no required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as never;
    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(UserRole.CUSTOMER))).toBe(true);
  });

  it('allows access when the authenticated role is in the required list', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ORGANIZER]),
    } as never;
    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(UserRole.ORGANIZER))).toBe(true);
  });

  it('denies access when the authenticated role is not in the required list', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ORGANIZER]),
    } as never;
    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(UserRole.CUSTOMER))).toBe(false);
  });

  it('denies access when roles are required but no user is authenticated', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.GATE]),
    } as never;
    const guard = new RolesGuard(reflector as Reflector);

    expect(guard.canActivate(createContext(undefined))).toBe(false);
  });
});
