import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('csrf')
export class CsrfController {
  @Get('token')
  getToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const csrfToken = req.csrfToken();

    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return { csrfToken };
  }
}