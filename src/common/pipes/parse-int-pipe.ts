import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

/**
 * Pipe personnalisé pour convertir les query parameters string en nombres
 * Utilisé pour les paramètres pagination comme page et limit
 */
@Injectable()
export class ParseIntQueryPipe implements PipeTransform {
  constructor(
    private readonly fields: string[] = ['page', 'limit'], // Champs à convertir
  ) {}

  transform(value: any) {
    if (!value || typeof value !== 'object') return value;

    const result = { ...value };
    for (const field of this.fields) {
      if (result[field] !== undefined && result[field] !== null) {
        const parsed = parseInt(result[field], 10);
        if (isNaN(parsed)) {
          throw new BadRequestException(
            `"${field}" doit être un nombre valide`,
          );
        }
        result[field] = parsed;
      }
    }
    return result;
  }
}
