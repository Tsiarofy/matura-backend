import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleUtilisateur } from '@prisma/client';
import { MajStatutDto } from './dto/maj-statut.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleUtilisateur.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('mentors')
  getMentors() {
    return this.adminService.getMentors();
  }

  @Get('investisseurs')
  getInvestisseurs() {
    return this.adminService.getInvestisseurs();
  }

  @Get('entrepreneurs')
  getEntrepreneurs() {
    return this.adminService.getEntrepreneurs();
  }

  @Patch('utilisateurs/:id/statut')
  majStatutCompte(@Param('id') id: string, @Body() dto: MajStatutDto) {
    return this.adminService.majStatutCompte(id, dto);
  }
}
