import { Body, Controller, Post, HttpCode, HttpStatus, Response} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, SignInDto, SingUpDto } from './dto/auth.dto';
import path from 'path';
// import {Request,Response} from 'express'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    
    @Post("singin")
    singin (@Body() dto:SignInDto) {
        return this.authService.singin(dto)
    }
    
    @Post("singup")
    singup (@Body() dto:SingUpDto) {
        return this.authService.signup(dto)
    }   
}
