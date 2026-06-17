import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryEntity } from './entities/inventory.entity';
import { InventoryTransactionEntity } from './entities/inventory-transaction.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all inventory',
    description:
      'Paginated inventory listing. Supports filtering by variantId, productId, stockStatus (computed), isInStock, and isLowStock. Results include associated variant details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated inventory list returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get inventory transactions',
    description:
      'Paginated inventory transaction history. Supports filtering by variantId, inventoryId, transaction type, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated transaction list returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findTransactions(@Query() query: TransactionQueryDto) {
    return this.inventoryService.findTransactions(query);
  }

  @Get('transactions/:id')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description: 'Retrieve a single inventory transaction by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction returned successfully',
    type: InventoryTransactionEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findTransactionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryTransactionEntity> {
    return this.inventoryService.findTransactionById(id);
  }

  @Get('variant/:variantId')
  @ApiOperation({
    summary: 'Get inventory by variant ID',
    description:
      'Retrieve inventory record for a specific product variant, including computed stock status.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'Product Variant UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory returned successfully',
    type: InventoryEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Inventory not found for this variant' })
  async findByVariantId(
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<InventoryEntity> {
    return this.inventoryService.findByVariantId(variantId);
  }

  @Patch('variant/:variantId')
  @ApiOperation({
    summary: 'Update inventory threshold',
    description:
      'Update low stock threshold for a specific product variant. Only lowStockThreshold can be modified directly; all other stock changes must go through POST /inventory/adjust.',
  })
  @ApiParam({
    name: 'variantId',
    description: 'Product Variant UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory updated successfully',
    type: InventoryEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Inventory not found for this variant' })
  async update(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateInventoryDto,
  ): Promise<InventoryEntity> {
    return this.inventoryService.update(variantId, dto);
  }

  @Post('adjust')
  @ApiOperation({
    summary: 'Adjust stock',
    description:
      'Manually adjust stock levels and automatically create an inventory transaction record. Supports all transaction types: IN, OUT, PURCHASE, SALE, ADJUSTMENT, RESERVE, RELEASE, DAMAGE, RETURN. Never allows stock below zero.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock adjusted successfully',
    type: InventoryEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error or negative stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Inventory not found for this variant' })
  async adjust(
    @Body() dto: AdjustInventoryDto,
  ): Promise<InventoryEntity> {
    return this.inventoryService.adjust(dto);
  }
}
