
import { ExtractJwt, Strategy,StrategyOptions } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthDto, SessionDto, SignInDto } from './dto/auth.dto';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:process.env.SECRET_KEY!,
    });
  }

  async validate(payload:SessionDto) {
      // console.log("- - - - PAYLOAD - - - - ")
      // console.log(payload)
    return {payload};
  }
}
