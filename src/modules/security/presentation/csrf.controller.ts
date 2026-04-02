import { Controller, Get, Req, Res } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

@Controller('csrf')
export class CsrfController {
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