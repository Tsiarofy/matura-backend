// import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
// import { ProjetDto, UpdateDto } from "./projet.dto";
// import { isDate, IsDate } from "class-validator";

// export class ParseCreateProjetPipe implements PipeTransform{
//        transform(value:any):ProjetDto{
//         console.log(isDate(new Date(value.dateDebutPrevu as string)))
//            return {
//             titre:value.titre,
//             dateDebutPrevu:new Date(value.dateDebutPrevu as string),
//             dateFinPrevu:new Date(value.dateFinPrevu as string),
//             description:value.description
//            }
//        }
      
// }
// export class ParseUpdateProjetPipe implements PipeTransform{
//     transform(value:UpdateDto, metadata: ArgumentMetadata):UpdateDto{
//         return {
//             titre:value.titre,
//             dateDebutPrevu:value.dateDebutPrevu?new Date(value.dateDebutPrevu):undefined,
//             dateFinPrevu:value.dateFinPrevu?new Date(value.dateFinPrevu):undefined,
//             description:value.description
//            }
//     }
// }