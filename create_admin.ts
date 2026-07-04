import { PrismaClient, RoleUtilisateur, StatutCompte } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gmail.com';
  // Vous pourrez changer ce mot de passe plus tard si vous le souhaitez
  const password = 'Admin1016'; 
  const prenom = 'Admin';
  const nom = 'Plateforme';

  console.log('Connexion à la base de données...');

  try {
    // 1. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Vérifier si un compte avec cet email existe déjà
    const existingAdmin = await prisma.utilisateur.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`\nUn utilisateur avec l'email ${email} existe déjà.`);
      return;
    }

    // 3. Insérer l'utilisateur dans la base de données
    const admin = await prisma.utilisateur.create({
      data: {
        email,
        password: hashedPassword,
        prenom,
        nom,
        role: RoleUtilisateur.ADMIN,
        statut_compte: StatutCompte.APPROUVE, // Les admins sont approuvés d'office
      },
    });

    console.log(`\n✅ Administrateur créé avec succès !`);
    console.log(`-------------------------------------`);
    console.log(`Email        : ${admin.email}`);
    console.log(`Mot de passe : ${password}`);
    console.log(`-------------------------------------`);
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
