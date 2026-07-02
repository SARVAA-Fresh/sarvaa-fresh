import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public } from '@/common/decorators/public.decorator';
import { PublicSettingsResponseDto } from './dto/public-settings-response.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiResponse({ status: 200, description: 'Returns grouped public settings', type: PublicSettingsResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async findAllPublic(): Promise<PublicSettingsResponseDto> {
    return this.settingsService.findAllPublic();
  }
}
