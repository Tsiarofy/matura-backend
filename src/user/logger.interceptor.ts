import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // --- 1. ACCÈS À LA REQUÊTE ---
    const request = context.switchToHttp().getRequest();
    console.log('Avant : ', request.body);

    // --- 2. LOGIQUE AVANT LE GESTIONNAIRE ---
    
    return next
      .handle()
      .pipe(
        map(data => {
          // --- 3. ACCÈS À LA RÉPONSE ET TRANSFORMATION ---
          console.log('Après : ', data);
          return { data, time: Date.now() }; // Transformation de la réponse
        }),
      );
  }
}
