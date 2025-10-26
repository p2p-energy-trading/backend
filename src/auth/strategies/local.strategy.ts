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
 * - Validates credentials via AuthService.validateProsumer()
 * - Returns prosumer object that will be injected to req.user
 *
 * @see {@link LocalAuthGuard} Guard that activates this strategy
 * @see {@link AuthService.validateProsumer} Called by validate() method
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
   * Validate Prosumer Credentials
   *
   * Method called automatically by Passport when LocalAuthGuard is active.
   * Passport will extract email & password from request body.
   *
   * @param email - Prosumer email extracted from request body
   * @param password - Prosumer password extracted from request body
   * @returns ValidatedProsumer object that will be injected to req.user
   * @throws {UnauthorizedException} If credentials are invalid
   *
   * @workflow
   * 1. Passport extracts credentials from request body
   * 2. Calls validate() with email and password
   * 3. validate() delegates to authService.validateProsumer()
   * 4. authService verifies email exists and password matches
   * 5. Returns prosumer object if valid
   * 6. Passport injects prosumer to req.user
   * 7. Controller can access validated user via req.user
   *
   * @example
   * // Request:
   * POST /auth/login
   * {
   *   "email": "prosumer@enerlink.com",
   *   "password": "SecurePass123"
   * }
   *
   * // If valid, req.user will contain:
   * {
   *   prosumerId: "prosumer_123",
   *   email: "prosumer@enerlink.com",
   *   name: "John Doe",
   *   createdAt: "2025-10-23T...",
   *   updatedAt: "2025-10-23T..."
   * }
   */
  async validate(email: string, password: string): Promise<any> {
    // Delegate validation to AuthService
    const prosumer = await this.authService.validateProsumer(email, password);

    if (!prosumer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Return prosumer object - will be available as req.user in controller
    return prosumer;
  }
}
