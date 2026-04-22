
import { ExtractJwt, Strategy,StrategyOptions } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import {PayloadDto} from '@matura/shared'


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:process.env.JWT_ACCESS_SECRET as string,
    });
  }

  async validate(payload:PayloadDto) {
      // console.log("- - - - PAYLOAD - - - - ")
      // console.log(payload)
    return {payload};
  }
}
