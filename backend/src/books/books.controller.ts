import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators';
import { CreateBookDto, UpdateBookDto } from './books.dto';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private books: BooksService) {}
  @Get() list(@Query('q') q?: string) { return this.books.list(q); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.books.get(id); }
  @Roles(Role.LIBRARIAN) @Post() create(@Body() dto: CreateBookDto) { return this.books.create(dto); }
  @Roles(Role.LIBRARIAN) @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) { return this.books.update(id, dto); }
  @Roles(Role.LIBRARIAN) @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.books.remove(id); }
}
