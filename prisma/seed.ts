import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function main() {
  const csvFilePath = path.resolve(__dirname, 'mdg_admpop_adm4_2018.csv');
  const results: any[] = [];

  console.log('📖 Analyse du fichier CSV en cours...');

  const stream = fs.createReadStream(csvFilePath).pipe(csv());

  for await (const row of stream) {
    // 1. Ignorer la ligne HXL si elle existe
    if (row['ADM4_PCODE']?.startsWith('#')) continue;

    // 2. Mapping précis basé sur l'analyse du fichier
    const fktCode = row['ADM4_PCODE']?.trim();
    
    // Validation : On accepte les codes de 12 ou 13 caractères selon le format du fichier
    if (!fktCode || fktCode.length < 12) continue;

    // La colonne de population 2018 est 'T_TL' dans votre fichier
    const pop2018 = parseInt(row['T_TL']) || 0;
    
    // Calcul de la projection 2026 (8 ans après 2018, taux 3.01%)
    const projection2026 = Math.round(pop2018 * Math.pow(1 + 0.0301, 8));

    results.push({
      code_region: row['ADM1_PCODE']?.trim() || '',
      nom_region: row['ADM1_EN']?.trim() || '',
      code_district: row['ADM2_PCODE']?.trim() || '',
      nom_district: row['ADM2_EN']?.trim() || '',
      code_commune: row['ADM3_PCODE']?.trim() || '',
      nom_commune: row['ADM3_EN']?.trim() || '',
      code_fokontany: fktCode,
      nom_fokontany: row['ADM4_EN']?.trim() || '',
      population_2018: pop2018,
      projection_2026: projection2026,
    });
  }

  if (results.length === 0) {
    console.error("❌ Aucune donnée trouvée. Vérifiez que le fichier est au bon endroit.");
    return;
  }

  console.log(`🧹 Nettoyage de la table et insertion de ${results.length} lignes...`);

  // Transaction pour vider et remplir proprement
  await prisma.$transaction([
    prisma.donneesGeographiques.deleteMany({}),
  ]);

  // Insertion par lots pour la performance
  const batchSize = 500;
  for (let i = 0; i < results.length; i += batchSize) {
    await prisma.donneesGeographiques.createMany({
      data: results.slice(i, i + batchSize),
      skipDuplicates: true,
    });
    const progress = Math.round((i / results.length) * 100);
    process.stdout.write(`\r🚀 Progression : ${progress}%`);
  }

  console.log('\n✅ Données importées et auditées avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });