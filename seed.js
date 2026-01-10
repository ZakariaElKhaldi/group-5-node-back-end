require('dotenv').config();
const { sequelize } = require('./src/models');
const {
    Client,
    Machine,
    Technicien,
    User,
    Piece,
    Fournisseur,
    Intervention,
    Panne,
    PieceIntervention,
    Role,
} = require('./src/models');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('🌱 Starting database seeding...');

        // Get existing admin role
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const techRole = await Role.findOne({ where: { name: 'technician' } });

        // 1. Create Clients
        console.log('📦 Creating clients...');
        const clients = await Client.bulkCreate([
            { nom: 'ABC Industries', telephone: '0612345678', adresse: '10 Rue de la Gare, Paris', email: 'contact@abc-ind.fr' },
            { nom: 'TechCorp', telephone: '0698765432', adresse: '25 Avenue des Champs, Lyon', email: 'info@techcorp.com' },
            { nom: 'AutoPlus', telephone: '0687654321', adresse: '5 Boulevard Victor Hugo, Marseille', email: 'service@autoplus.fr' },
        ]);
        console.log(`✅ Created ${clients.length} clients`);

        // 2. Create Machines
        console.log('🏭 Creating machines...');
        const machines = await Machine.bulkCreate([
            { reference: 'MCH-001', modele: 'Presse Hydraulique XL-500', marque: 'Bosch', type: 'Presse', numeroSerie: 'SN2024001', dateAcquisition: '2020-01-15', statut: 'Operationnel', clientId: clients[0].id },
            { reference: 'MCH-002', modele: 'Tour CNC ProMax', marque: 'Haas', type: 'Tour', numeroSerie: 'SN2024002', dateAcquisition: '2019-05-20', statut: 'Operationnel', clientId: clients[0].id },
            { reference: 'MCH-003', modele: 'Fraiseuse Verticale VM-200', marque: 'DMG MORI', type: 'Fraiseuse', numeroSerie: 'SN2024003', dateAcquisition: '2021-03-10', statut: 'En panne', clientId: clients[1].id },
            { reference: 'MCH-004', modele: 'Compresseur Atlas Copco', marque: 'Atlas Copco', type: 'Compresseur', numeroSerie: 'SN2024004', dateAcquisition: '2022-07-01', statut: 'Operationnel', clientId: clients[1].id },
            { reference: 'MCH-005', modele: 'Pont Roulant 10T', marque: 'Konecranes', type: 'Levage', numeroSerie: 'SN2024005', dateAcquisition: '2018-11-25', statut: 'En maintenance', clientId: clients[2].id },
        ]);
        console.log(`✅ Created ${machines.length} machines`);

        // 3. Create Techniciens with Users
        console.log('👷 Creating techniciens...');
        const hashPassword = await bcrypt.hash('password', 10);

        const tech1User = await User.create({
            email: 'tech1@local.host',
            password: hashPassword,
            nom: 'Dubois',
            prenom: 'Pierre',
            roles: ['ROLE_TECHNICIEN'],
            roleId: techRole?.id,
        });

        const tech2User = await User.create({
            email: 'tech2@local.host',
            password: hashPassword,
            nom: 'Martin',
            prenom: 'Sophie',
            roles: ['ROLE_TECHNICIEN'],
            roleId: techRole?.id,
        });

        const techniciens = await Technicien.bulkCreate([
            { userId: tech1User.id, specialite: 'Hydraulique', tauxHoraire: 45, statut: 'Disponible' },
            { userId: tech2User.id, specialite: 'Électromécanique', tauxHoraire: 50, statut: 'Disponible' },
        ]);
        console.log(`✅ Created ${techniciens.length} techniciens`);

        // 4. Create Fournisseurs
        console.log('🚚 Creating fournisseurs...');
        const fournisseurs = await Fournisseur.bulkCreate([
            { nom: 'Pièces Industrielles SA', telephone: '0145678901', adresse: 'Zone Industrielle, Lille', email: 'ventes@pieces-ind.fr' },
            { nom: 'Hydraulique Pro', telephone: '0156789012', adresse: '12 Rue des Usines, Nantes', email: 'contact@hydraulique-pro.com' },
        ]);
        console.log(`✅ Created ${fournisseurs.length} fournisseurs`);

        // 5. Create Pieces
        console.log('🔧 Creating pieces...');
        const pieces = await Piece.bulkCreate([
            { nom: 'Joint hydraulique 50mm', reference: 'JH-50', quantiteStock: 25, seuilAlerte: 10, prixUnitaire: 12.50, fournisseurId: fournisseurs[1].id },
            { nom: 'Filtre à huile standard', reference: 'FH-STD', quantiteStock: 50, seuilAlerte: 15, prixUnitaire: 8.75, fournisseurId: fournisseurs[0].id },
            { nom: 'Courroie transmission V-Belt', reference: 'CT-VB', quantiteStock: 30, seuilAlerte: 10, prixUnitaire: 15.00, fournisseurId: fournisseurs[0].id },
            { nom: 'Roulement à billes 6205', reference: 'RB-6205', quantiteStock: 5, seuilAlerte: 10, prixUnitaire: 22.00, fournisseurId: fournisseurs[0].id }, // Low stock!
        ]);
        console.log(`✅ Created ${pieces.length} pieces`);

        // 6. Create Interventions & Pannes
        console.log('🔨 Creating interventions & pannes...');

        // Past interventions
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10);

        const intervention1 = await Intervention.create({
            machineId: machines[0].id,
            technicienId: techniciens[0].id,
            type: 'Preventive',
            priorite: 'Normale',
            statut: 'Terminee',
            description: 'Maintenance préventive trimestrielle',
            dateDebut: twoMonthsAgo,
            dateFin: new Date(twoMonthsAgo.getTime() + 2 * 60 * 60 * 1000), // +2 hours
            dureeEstimee: 120,
            coutMainOeuvre: 90,
            coutPieces: 12.50,
            coutTotal: 102.50,
            resolution: 'Maintenance effectuée, changement du joint hydraulique',
        });

        const intervention2 = await Intervention.create({
            machineId: machines[1].id,
            technicienId: techniciens[1].id,
            type: 'Corrective',
            priorite: 'Urgente',
            statut: 'Terminee',
            description: 'Réparation suite à panne électrique',
            dateDebut: lastMonth,
            dateFin: new Date(lastMonth.getTime() + 3 * 60 * 60 * 1000),
            dureeEstimee: 180,
            coutMainOeuvre: 150,
            coutPieces: 45.75,
            coutTotal: 195.75,
            resolution: 'Remplacement filtre et courroie',
        });

        // Current ongoing intervention
        const intervention3 = await Intervention.create({
            machineId: machines[2].id,
            technicienId: techniciens[0].id,
            type: 'Corrective',
            priorite: 'Urgente',
            statut: 'En cours',
            description: 'Fraiseuse ne démarre plus',
            dateDebut: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Started 1h ago
            dureeEstimee: 240,
        });

        // Pending intervention
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const intervention4 = await Intervention.create({
            machineId: machines[4].id,
            technicienId: techniciens[1].id,
            type: 'Preventive',
            priorite: 'Normale',
            statut: 'En attente',
            description: 'Contrôle annuel pont roulant',
            dateDebut: tomorrow,
            dureeEstimee: 300,
        });

        console.log(`✅ Created 4 interventions`);

        // Create Pannes for machines
        const panne1 = await Panne.create({
            machineId: machines[2].id,
            interventionId: intervention3.id,
            description: 'Disjoncteur déclenché',
            dateSignalement: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            dateDeclaration: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            gravite: 'Moyenne',
            statut: 'En cours',
        });

        console.log(`✅ Created pannes`);

        // Add pieces to interventions
        await PieceIntervention.bulkCreate([
            { pieceId: pieces[0].id, interventionId: intervention1.id, quantite: 1, prixUnitaireApplique: 12.50, dateUtilisation: intervention1.dateDebut },
            { pieceId: pieces[1].id, interventionId: intervention2.id, quantite: 2, prixUnitaireApplique: 8.75, dateUtilisation: intervention2.dateDebut },
            { pieceId: pieces[2].id, interventionId: intervention2.id, quantite: 1, prixUnitaireApplique: 15.00, dateUtilisation: intervention2.dateDebut },
        ]);

        // Update stock quantities
        await pieces[0].update({ quantiteStock: 24 });
        await pieces[1].update({ quantiteStock: 48 });
        await pieces[2].update({ quantiteStock: 29 });

        console.log(`✅ Added pieces to interventions`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - ${clients.length} clients`);
        console.log(`   - ${machines.length} machines`);
        console.log(`   - ${techniciens.length} techniciens`);
        console.log(`   - ${pieces.length} pieces (1 low stock)`);
        console.log(`   - ${fournisseurs.length} fournisseurs`);
        console.log(`   - 4 interventions (2 completed, 1 ongoing, 1 pending)`);
        console.log(`   - 1 panne`);

    } catch (error) {
        console.error('❌ Seeding error:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

seed();
