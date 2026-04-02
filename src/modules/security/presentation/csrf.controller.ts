import { Controller, Get, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { CsrfTokenResponseDto } from './dto/csrf-token-response.dto';

@ApiTags('Security')
@ApiSecurity('api-token')
@ApiBearerAuth('api-token-bearer')
@ApiCookieAuth('XSRF-TOKEN')
@Controller('csrf')
export class CsrfController {
  @ApiOperation({
    summary: 'Issue CSRF token',
    description:
      'Returns a CSRF token in the response body and mirrors it to the XSRF-TOKEN cookie for subsequent unsafe requests.',
  })
  @ApiOkResponse({ type: CsrfTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API token.' })
  @Get('token')
  getToken(@Req() _req: Request, @Res({ passthrough: true }) res: Response) {
    const csrfToken = randomBytes(32).toString('hex');

    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return { csrfToken };
  }
}