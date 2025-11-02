import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Local Authentication Strategy
 *
 * Handles username/password authentication using Passport.js
 * This strategy is activated by LocalAuthGuard on login endpoint.
 *
 * @remarks
 * - Uses 'email' field as username (configured in constructor)
 * - Password field uses default 'password' name
 * - Validates credentials via AuthService.validateUser()
 * - Returns user object that will be injected to req.user
 *
 * @see {@link LocalAuthGuard} Guard that activates this strategy
 * @see {@link AuthService.validateUser} Called by validate() method
 * @see {@link AuthController.login} Endpoint that uses this strategy
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Field name in request body for username
      passwordField: 'password', // Field name in request body (default)
    });
  }

  /**
   * Validate User Credentials
   *
   * Method called automatically by Passport when LocalAuthGuard is active.
   * Passport will extract email & password from request body.
   *
   * @param email - User email extracted from request body
   * @param password - User password extracted from request body
   * @returns ValidatedUser object that will be injected to req.user
   * @throws {UnauthorizedException} If credentials are invalid
   *
   * @workflow
   * 1. Passport extracts credentials from request body
   * 2. Calls validate() with email and password
   * 3. validate() delegates to authService.validateUser()
   * 4. authService verifies email exists and password matches
   * 5. Returns user object if valid
   * 6. Passport injects user to req.user
   * 7. Controller can access validated user via req.user
   *
   * @example
   * // Request:
   * POST /auth/login
   * {
   *   "email": "user@enerlink.com",
   *   "password": "SecurePass123"
   * }
   *
   * // If valid, req.user will contain:
   * {
   *   userId: "user_123",
   *   email: "user@enerlink.com",
   *   name: "John Doe",
   *   createdAt: "2025-10-23T...",
   *   updatedAt: "2025-10-23T..."
   * }
   */
  async validate(email: string, password: string): Promise<any> {
    // Delegate validation to AuthService
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return user object - will be available as req.user in controller
    return user;
  }
}
