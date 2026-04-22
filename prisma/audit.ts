import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditGeoData() {
  console.log('🔍 Audit des données réelles importées...');

  const allData = await prisma.donneesGeographiques.findMany();
  const total = allData.length;
  const errors: any[] = [];

  allData.forEach((row) => {
    const issues: string[] = [];

    // Vérification des champs vides
    if (!row.nom_fokontany) issues.push('Nom Fokontany vide');
    if (row.population_2018 === 0) issues.push('Population à zéro');

    // Nouveaux standards basés sur VOTRE fichier CSV
    if (row.code_district.length < 7 || row.code_district.length > 11) issues.push(`District length: ${row.code_district.length}`);
    if (row.code_fokontany.length < 12 || row.code_fokontany.length > 13) issues.push(`Fokontany length: ${row.code_fokontany.length}`);

    if (issues.length > 0) {
      errors.push({ id: row.code_fokontany, issues });
    }
  });

  console.log('--- RAPPORT D\'AUDIT MIS À JOUR ---');
  console.log(`📊 Total lignes : ${total}`);
  console.log(`✅ Lignes conformes au dataset : ${total - errors.length}`);
  console.log(`❌ Lignes suspectes : ${errors.length}`);

  if (errors.length > 0) {
    console.table(errors.slice(0, 5));
  } else {
    console.log("✨ Parfait ! Toutes les données correspondent au format du fichier source.");
  }
}

auditGeoData().finally(() => prisma.$disconnect());



async function auditUniformite() {
  console.log('🔍 Analyse de l\'uniformité des P-Codes...');

  // Requête pour grouper par longueur de chaîne
  const results = await prisma.donneesGeographiques.groupBy({
    by: ['code_region', 'code_district', 'code_commune', 'code_fokontany'],
    _count: {
      _all: true,
    },
  });

  // On transforme cela en une analyse de longueurs
  const analyse = results.reduce((acc, row) => {
    const len = {
      reg: row.code_region.length,
      dist: row.code_district.length,
      com: row.code_commune.length,
      fkt: row.code_fokontany.length,
    };
    const key = `Reg:${len.reg} | Dist:${len.dist} | Com:${len.com} | Fkt:${len.fkt}`;
    acc[key] = (acc[key] || 0) + row._count._all;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n--- RÉPARTITION DES FORMATS (Longueur des P-Codes) ---');
  console.table(analyse);

  console.log('\nAnalyse :');
  if (Object.keys(analyse).length === 1) {
    console.log('✅ Uniformité parfaite : Toutes les données suivent exactement le même format.');
  } else {
    console.log('⚠️ Hétérogénéité détectée : Plusieurs formats de P-Codes coexistent.');
    console.log('Si vous avez plus d\'une ligne dans le tableau ci-dessus, certains P-Codes sont atypiques.');
  }
}

auditUniformite().finally(() => prisma.$disconnect());