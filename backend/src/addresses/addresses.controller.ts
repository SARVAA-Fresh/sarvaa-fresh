import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressEntity } from './entities/address.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer-auth')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new address',
    description: 'Create a new delivery address for the authenticated user. Setting isDefault=true will unset any existing default address.',
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    type: AddressEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressEntity> {
    return this.addressesService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all addresses',
    description: 'Retrieve all addresses for the authenticated user. Default address appears first. Soft-deleted addresses are excluded.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of addresses returned successfully',
    type: [AddressEntity],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<AddressEntity[]> {
    return this.addressesService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get address by ID',
    description: 'Retrieve a single address by its UUID. Users can only access their own addresses.',
  })
  @ApiParam({ name: 'id', description: 'Address UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Address returned successfully',
    type: AddressEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressEntity> {
    return this.addressesService.findById(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an address',
    description: 'Update an existing address. Setting isDefault=true will unset the previous default address.',
  })
  @ApiParam({ name: 'id', description: 'Address UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: AddressEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressEntity> {
    return this.addressesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete an address',
    description: 'Soft delete an address by setting deletedAt. Users can only delete their own addresses.',
  })
  @ApiParam({ name: 'id', description: 'Address UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Address soft deleted successfully',
    type: AddressEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async softDelete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressEntity> {
    return this.addressesService.softDelete(user.userId, id);
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Set address as default',
    description: 'Mark an address as the default for the authenticated user. This automatically unsets any other default address.',
  })
  @ApiParam({ name: 'id', description: 'Address UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Address set as default successfully',
    type: AddressEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefault(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AddressEntity> {
    return this.addressesService.setDefault(user.userId, id);
  }
}
