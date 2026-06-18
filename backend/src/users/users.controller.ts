import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get profile of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findById(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get user profile by user ID (self only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — can only access your own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (id !== user.userId) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.usersService.findById(id);
  }
}