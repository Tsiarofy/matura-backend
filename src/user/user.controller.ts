import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { ParseUserPipe } from './parse-user.pipe';
import { AuthDto } from 'src/auth/dto/auth.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { ClientRole } from 'src/auth/roles.enum';
import { UpdateDto } from 'src/projet/projet.dto';
import { LoggerInterceptor} from './logger.interceptor';
// console.log("fichier chargé")
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }
    
    @Get("/findAll")
    getUsers() {
        return this.userService.getAllUser();
    }
    @Get("getByMail/:email")
    getUser(@Param('email', ParseUserPipe) user: Partial<AuthDto>) {
        return typeof (user)
    }
    @Patch("/update/:id")
    updateUser(@Param('id', ParseIntPipe) id:string, @Body() data: UpdateDto) {

        return this.userService.updateUser(id, data)
    }
    @Patch("delete/:id")
    deleteUser(@Param('id', ParseIntPipe) id:string) {
        return this.userService.deleteUser(id)
    }
    
    @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(ClientRole.ADMIN)
    @Get("/test")
    test(@Request() req: { user: AuthDto }) {
        return "Entrer"
    }

    @Post('/register')
    @UseInterceptors(LoggerInterceptor) // Applique l'intercepteur à cette route
    createUser(@Body() authDto: AuthDto) {
        console.log("REQUETE ARRIVE DANS LE HANDLER")
        // return this.userService.createUser(authDto);
    }
}
