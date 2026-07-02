import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingQueryDto } from './dto/setting-query.dto';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';
import { Setting } from '@prisma/client';

@ApiTags('Admin Settings')
@Controller('admin/settings')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('Bearer-auth')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Paginated settings list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin access required' })
  async findAll(@Query() query: SettingQueryDto) {
    return this.settingsService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Setting returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Setting> {
    return this.settingsService.findById(id);
  }

  @Post()
  @ApiResponse({ status: 201, description: 'Setting created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Duplicate key' })
  async create(@Body() dto: CreateSettingDto): Promise<Setting> {
    return this.settingsService.create(dto);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Setting updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({ status: 409, description: 'Duplicate key' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<Setting> {
    return this.settingsService.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Setting soft-deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<Setting> {
    return this.settingsService.softDelete(id);
  }
}
