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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartEntity } from './entities/cart.entity';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('Bearer-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current user cart',
    description: 'Retrieve the authenticated user\'s cart with items, subtotal, and item count. Auto-creates cart if missing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart returned successfully',
    type: CartEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@CurrentUser() user: CurrentUserPayload): Promise<CartEntity> {
    return this.cartService.getCart(user.userId) as any;
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Add a product variant to the cart. If the same variant already exists, quantity is increased. Validates variant exists and sufficient inventory is available. Saves current variant price as unitPrice.',
  })
  @ApiResponse({
    status: 201,
    description: 'Item added successfully',
    type: CartEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  async addItem(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCartItemDto,
  ): Promise<CartEntity> {
    return this.cartService.addItem(user.userId, dto) as any;
  }

  @Patch('items/:id')
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Update quantity of an existing cart item. Validates sufficient inventory is available.',
  })
  @ApiParam({ name: 'id', description: 'Cart Item UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: CartEntity,
  })
  @ApiResponse({ status: 400, description: 'Validation error or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartEntity> {
    return this.cartService.updateItem(user.userId, id, dto) as any;
  }

  @Delete('items/:id')
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Soft delete a cart item. Updates cart subtotal.',
  })
  @ApiParam({ name: 'id', description: 'Cart Item UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({
    status: 200,
    description: 'Item removed successfully',
    type: CartEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CartEntity> {
    return this.cartService.removeItem(user.userId, id) as any;
  }

  @Delete()
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Soft delete all items in the cart and reset subtotal to zero.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: CartEntity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@CurrentUser() user: CurrentUserPayload): Promise<CartEntity> {
    return this.cartService.clearCart(user.userId) as any;
  }
}
