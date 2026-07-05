import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '@/common/guards/admin-jwt.guard';
import { ProductImagesService } from './product-images.service';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@ApiTags('Admin Product Images')
@Controller('admin/products')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('Bearer-auth')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post(':productId/images')
  @ApiOperation({ summary: 'Upload product images', description: 'Upload 1-5 JPEG/PNG/WebP images, max 5 MB each.' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '1-5 JPEG, PNG, or WebP images (max 5 MB each)',
    required: true,
    schema: {
      type: 'object',
      required: ['images'],
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Image files',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Images uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file or product' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseInterceptors(FilesInterceptor('images', 5))
  async upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images provided');
    }
    return this.productImagesService.uploadImages(productId, files);
  }

  @Patch(':productId/images/:imageId')
  @ApiOperation({ summary: 'Update product image metadata' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Product Image UUID' })
  @ApiResponse({ status: 200, description: 'Image updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Image or product not found' })
  async update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImagesService.updateImage(productId, imageId, dto);
  }

  @Delete(':productId/images/:imageId')
  @ApiOperation({ summary: 'Delete a product image' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Product Image UUID' })
  @ApiResponse({ status: 200, description: 'Image deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Image or product not found' })
  async delete(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    await this.productImagesService.deleteImage(productId, imageId);
  }
}
