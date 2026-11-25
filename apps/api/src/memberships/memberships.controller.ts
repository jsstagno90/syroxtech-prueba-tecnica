import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  createMembershipTierSchema,
  idParamSchema,
  membershipTierListQuerySchema,
  updateMembershipTierSchema,
  type CreateMembershipTierDto,
  type MembershipTierListQuery,
  type UpdateMembershipTierDto,
} from '@admin/shared';
import { MembershipsService } from './memberships.service.js';

@ApiTags('Membresías')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  findAll(@Query({ schema: membershipTierListQuerySchema }) query: MembershipTierListQuery) {
    return this.memberships.findAll(query);
  }

  @Post()
  create(@Body({ schema: createMembershipTierSchema }) body: CreateMembershipTierDto) {
    return this.memberships.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: updateMembershipTierSchema }) body: UpdateMembershipTierDto,
  ) {
    return this.memberships.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.memberships.remove(id);
  }
}
