import { ApiProperty } from '@nestjs/swagger';

export class CsrfTokenResponseDto {
  @ApiProperty({
    example: '2d8c6c1efaf2f1d3d66b1ec0f9e9acb1fce4c67e5c8e1a58b7a22f87f7a8424a',
    description: 'CSRF token mirrored in the XSRF-TOKEN cookie and expected in x-csrf-token.',
  })
  csrfToken!: string;
}
