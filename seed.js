/**
 * Comprehensive Seed Script
 * Creates demo data for all GMAO features
 * Run with: node seed.js
 */

require('dotenv').config();
const { sequelize } = require('./src/models');
const {
    Client,
    Machine,
    Technicien,
    User,
    Piece,
    Fournisseur,
    MouvementStock,
    Notification,
    WorkOrder,
    Role,
} = require('./src/models');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('🌱 Starting comprehensive database seeding...\n');

        // ===============================
        // 1. ROLES
        // ===============================
        console.log('🔐 Seeding roles...');
        await Role.seed(); // Uses built-in defaults

        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        const techRole = await Role.findOne({ where: { name: 'technician' } });
        const receptionistRole = await Role.findOne({ where: { name: 'receptionist' } });
        const viewerRole = await Role.findOne({ where: { name: 'user' } });
        console.log('✅ Roles created: admin, technician, receptionist, user\n');

        // ===============================
        // 2. USERS
        // ===============================
        console.log('👤 Seeding users...');
        // Use plain password - we'll hash manually with hooks: false to avoid double-hashing
        const plainPassword = 'password123';
        const hashPassword = await bcrypt.hash(plainPassword, 10);

        // Admin user - use direct create with hooks:false to control hashing
        let [adminUser, adminCreated] = await User.findOrCreate({
            where: { email: 'admin@gmao.local' },
            defaults: {
                email: 'admin@gmao.local',
                password: hashPassword, // Pre-hashed
                nom: 'Admin',
                prenom: 'Super',
                roles: ['ROLE_ADMIN'],
                roleId: adminRole.id,
            },
            hooks: false, // Disable beforeCreate hook to avoid double-hashing
        });

        // Receptionist users
        const receptionist1 = await User.findOrCreate({
            where: { email: 'reception@gmao.local' },
            defaults: {
                email: 'reception@gmao.local',
                password: hashPassword,
                nom: 'Bernard',
                prenom: 'Claire',
                roles: ['ROLE_RECEPTIONIST'],
                roleId: receptionistRole.id,
            },
        });

        const receptionist2 = await User.findOrCreate({
            where: { email: 'accueil@gmao.local' },
            defaults: {
                email: 'accueil@gmao.local',
                password: hashPassword,
                nom: 'Durand',
                prenom: 'Marc',
                roles: ['ROLE_RECEPTIONIST'],
                roleId: receptionistRole.id,
            },
        });

        // Technician users (will create Technicien profiles below)
        const techUsers = [];
        const techData = [
            { email: 'tech1@gmao.local', nom: 'Dubois', prenom: 'Pierre', specialite: 'Hydraulique', tauxHoraire: 45, statut: 'Disponible' },
            { email: 'tech2@gmao.local', nom: 'Martin', prenom: 'Sophie', specialite: 'Électromécanique', tauxHoraire: 50, statut: 'Disponible' },
            { email: 'tech3@gmao.local', nom: 'Lefebvre', prenom: 'Jean', specialite: 'Pneumatique', tauxHoraire: 42, statut: 'En intervention' },
            { email: 'tech4@gmao.local', nom: 'Moreau', prenom: 'Isabelle', specialite: 'Automatisme', tauxHoraire: 55, statut: 'Absent' },
        ];

        for (const t of techData) {
            const [user] = await User.findOrCreate({
                where: { email: t.email },
                defaults: {
                    email: t.email,
                    password: hashPassword,
                    nom: t.nom,
                    prenom: t.prenom,
                    roles: ['ROLE_TECHNICIEN'],
                    roleId: techRole.id,
                },
            });
            techUsers.push({ user, ...t });
        }

        // Viewer user
        await User.findOrCreate({
            where: { email: 'viewer@gmao.local' },
            defaults: {
                email: 'viewer@gmao.local',
                password: hashPassword,
                nom: 'Petit',
                prenom: 'François',
                roles: ['ROLE_USER'],
                roleId: viewerRole.id,
            },
        });

        console.log('✅ Users created: 1 admin, 2 receptionists, 4 technicians, 1 viewer\n');

        // ===============================
        // 3. TECHNICIENS (profiles)
        // ===============================
        console.log('👷 Seeding technician profiles...');
        const techniciens = [];
        for (const t of techUsers) {
            const [technicien] = await Technicien.findOrCreate({
                where: { userId: t.user.id },
                defaults: {
                    userId: t.user.id,
                    specialite: t.specialite,
                    tauxHoraire: t.tauxHoraire,
                    statut: t.statut,
                },
            });
            techniciens.push(technicien);
        }
        console.log('✅ Technician profiles created: 4\n');

        // ===============================
        // 4. CLIENTS
        // ===============================
        console.log('🏢 Seeding clients...');
        const clientData = [
            { nom: 'ABC Industries', telephone: '0612345678', adresse: '10 Rue de la Gare, 75001 Paris', email: 'contact@abc-ind.fr' },
            { nom: 'TechCorp Solutions', telephone: '0698765432', adresse: '25 Avenue des Champs, 69001 Lyon', email: 'info@techcorp.com' },
            { nom: 'AutoPlus Garage', telephone: '0687654321', adresse: '5 Boulevard Victor Hugo, 13001 Marseille', email: 'service@autoplus.fr' },
            { nom: 'Manufacture Moderne', telephone: '0623456789', adresse: '42 Rue de l\'Industrie, 31000 Toulouse', email: 'contact@manufacture-moderne.fr' },
            { nom: 'Logistique Express', telephone: '0634567890', adresse: '8 Zone Portuaire, 33000 Bordeaux', email: 'operations@log-express.fr' },
        ];

        const clients = [];
        for (const c of clientData) {
            const [client] = await Client.findOrCreate({
                where: { email: c.email },
                defaults: c,
            });
            clients.push(client);
        }
        console.log('✅ Clients created: 5\n');

        // ===============================
        // 5. FOURNISSEURS
        // ===============================
        console.log('🚚 Seeding fournisseurs...');
        const fournisseurData = [
            { nom: 'Pièces Industrielles SA', telephone: '0145678901', adresse: 'Zone Industrielle Nord, 59000 Lille', email: 'ventes@pieces-ind.fr' },
            { nom: 'Hydraulique Pro', telephone: '0156789012', adresse: '12 Rue des Usines, 44000 Nantes', email: 'contact@hydraulique-pro.com' },
            { nom: 'Électro-Parts', telephone: '0167890123', adresse: '3 Avenue de l\'Électricité, 67000 Strasbourg', email: 'commandes@electro-parts.fr' },
            { nom: 'Roulements France', telephone: '0178901234', adresse: '7 Impasse Mécanique, 69000 Lyon', email: 'info@roulements-france.com' },
            { nom: 'Filtration Express', telephone: '0189012345', adresse: '15 Rue du Filtre, 13000 Marseille', email: 'service@filtration-express.fr' },
        ];

        const fournisseurs = [];
        for (const f of fournisseurData) {
            const [fournisseur] = await Fournisseur.findOrCreate({
                where: { email: f.email },
                defaults: f,
            });
            fournisseurs.push(fournisseur);
        }
        console.log('✅ Fournisseurs created: 5\n');

        // ===============================
        // 6. PIECES (Inventory)
        // ===============================
        console.log('🔧 Seeding pieces...');
        const pieceData = [
            { nom: 'Joint hydraulique 50mm', reference: 'JH-50', quantiteStock: 25, seuilAlerte: 10, prixUnitaire: 12.50, fournisseurId: fournisseurs[1].id },
            { nom: 'Filtre à huile standard', reference: 'FH-STD', quantiteStock: 50, seuilAlerte: 15, prixUnitaire: 8.75, fournisseurId: fournisseurs[4].id },
            { nom: 'Courroie transmission V-Belt', reference: 'CT-VB', quantiteStock: 30, seuilAlerte: 10, prixUnitaire: 15.00, fournisseurId: fournisseurs[0].id },
            { nom: 'Roulement à billes 6205', reference: 'RB-6205', quantiteStock: 5, seuilAlerte: 10, prixUnitaire: 22.00, fournisseurId: fournisseurs[3].id }, // LOW STOCK!
            { nom: 'Câble électrique 4mm²', reference: 'CE-4MM', quantiteStock: 100, seuilAlerte: 20, prixUnitaire: 2.50, fournisseurId: fournisseurs[2].id },
            { nom: 'Fusible 10A', reference: 'FUS-10A', quantiteStock: 200, seuilAlerte: 50, prixUnitaire: 0.75, fournisseurId: fournisseurs[2].id },
            { nom: 'Relais 24V', reference: 'REL-24V', quantiteStock: 15, seuilAlerte: 5, prixUnitaire: 18.00, fournisseurId: fournisseurs[2].id },
            { nom: 'Vérin pneumatique 100mm', reference: 'VP-100', quantiteStock: 8, seuilAlerte: 3, prixUnitaire: 85.00, fournisseurId: fournisseurs[0].id },
            { nom: 'Capteur inductif M12', reference: 'CAP-M12', quantiteStock: 3, seuilAlerte: 5, prixUnitaire: 35.00, fournisseurId: fournisseurs[2].id }, // LOW STOCK!
            { nom: 'Huile hydraulique ISO 46 (20L)', reference: 'HH-46-20', quantiteStock: 10, seuilAlerte: 4, prixUnitaire: 65.00, fournisseurId: fournisseurs[1].id },
            { nom: 'Graisse lithium (1kg)', reference: 'GR-LITH', quantiteStock: 20, seuilAlerte: 5, prixUnitaire: 12.00, fournisseurId: fournisseurs[1].id },
            { nom: 'Flexible hydraulique 1m', reference: 'FLX-1M', quantiteStock: 2, seuilAlerte: 5, prixUnitaire: 45.00, fournisseurId: fournisseurs[1].id }, // LOW STOCK!
            { nom: 'Contacteur 25A', reference: 'CONT-25A', quantiteStock: 12, seuilAlerte: 4, prixUnitaire: 42.00, fournisseurId: fournisseurs[2].id },
            { nom: 'Disjoncteur thermique 16A', reference: 'DISJ-16A', quantiteStock: 8, seuilAlerte: 3, prixUnitaire: 28.00, fournisseurId: fournisseurs[2].id },
            { nom: 'Variateur de fréquence 2.2kW', reference: 'VAR-2.2KW', quantiteStock: 2, seuilAlerte: 1, prixUnitaire: 350.00, fournisseurId: fournisseurs[2].id },
        ];

        const pieces = [];
        for (const p of pieceData) {
            const [piece] = await Piece.findOrCreate({
                where: { reference: p.reference },
                defaults: p,
            });
            pieces.push(piece);
        }
        console.log('✅ Pieces created: 15 (3 with low stock alerts)\n');

        // ===============================
        // 7. MACHINES
        // ===============================
        console.log('🏭 Seeding machines...');
        const machineData = [
            { reference: 'MCH-001', modele: 'Presse Hydraulique XL-500', marque: 'Bosch', type: 'Presse', numeroSerie: 'SN2024001', dateAcquisition: '2020-01-15', statut: 'Operationnel', clientId: clients[0].id },
            { reference: 'MCH-002', modele: 'Tour CNC ProMax', marque: 'Haas', type: 'Tour CNC', numeroSerie: 'SN2024002', dateAcquisition: '2019-05-20', statut: 'Operationnel', clientId: clients[0].id },
            { reference: 'MCH-003', modele: 'Fraiseuse Verticale VM-200', marque: 'DMG MORI', type: 'Fraiseuse', numeroSerie: 'SN2024003', dateAcquisition: '2021-03-10', statut: 'En panne', clientId: clients[1].id },
            { reference: 'MCH-004', modele: 'Compresseur Atlas Copco GA30', marque: 'Atlas Copco', type: 'Compresseur', numeroSerie: 'SN2024004', dateAcquisition: '2022-07-01', statut: 'Operationnel', clientId: clients[1].id },
            { reference: 'MCH-005', modele: 'Pont Roulant 10T', marque: 'Konecranes', type: 'Levage', numeroSerie: 'SN2024005', dateAcquisition: '2018-11-25', statut: 'En maintenance', clientId: clients[2].id },
            { reference: 'MCH-006', modele: 'Robot Soudure FANUC', marque: 'FANUC', type: 'Robot', numeroSerie: 'SN2024006', dateAcquisition: '2023-02-14', statut: 'Operationnel', clientId: clients[2].id },
            { reference: 'MCH-007', modele: 'Convoyeur à bande 50m', marque: 'Interroll', type: 'Convoyeur', numeroSerie: 'SN2024007', dateAcquisition: '2020-09-05', statut: 'Operationnel', clientId: clients[3].id },
            { reference: 'MCH-008', modele: 'Poinçonneuse CNC Trumpf', marque: 'Trumpf', type: 'Poinçonneuse', numeroSerie: 'SN2024008', dateAcquisition: '2021-06-18', statut: 'En panne', clientId: clients[3].id },
            { reference: 'MCH-009', modele: 'Chariot élévateur Toyota 3T', marque: 'Toyota', type: 'Chariot', numeroSerie: 'SN2024009', dateAcquisition: '2019-12-01', statut: 'Operationnel', clientId: clients[4].id },
            { reference: 'MCH-010', modele: 'Groupe électrogène 100kVA', marque: 'Caterpillar', type: 'Électrogène', numeroSerie: 'SN2024010', dateAcquisition: '2017-04-20', statut: 'Operationnel', clientId: clients[4].id },
        ];

        const machines = [];
        for (const m of machineData) {
            const [machine] = await Machine.findOrCreate({
                where: { reference: m.reference },
                defaults: m,
            });
            machines.push(machine);
        }
        console.log('✅ Machines created: 10 (2 en panne, 1 en maintenance)\n');

        // ===============================
        // 8. WORK ORDERS
        // ===============================
        console.log('📋 Seeding work orders...');
        const now = new Date();
        const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
        const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const workOrderData = [
            // COMPLETED (5)
            { machineId: machines[0].id, technicienId: techniciens[0].id, type: 'preventive', origin: 'scheduled', priority: 'medium', status: 'completed', description: 'Maintenance préventive trimestrielle - Vérification des niveaux et lubrification', resolution: 'Maintenance effectuée. Changement du joint hydraulique préventif.', dateReported: daysAgo(30), dateStarted: daysAgo(28), dateCompleted: daysAgo(28), actualDuration: 120, laborCost: 90.00, partsCost: 12.50 },
            { machineId: machines[1].id, technicienId: techniciens[1].id, type: 'corrective', origin: 'breakdown', priority: 'high', severity: 'major', status: 'completed', description: 'Alarme surchauffe moteur principal', resolution: 'Remplacement du filtre à huile encrassé et vidange complète.', dateReported: daysAgo(20), dateStarted: daysAgo(19), dateCompleted: daysAgo(19), actualDuration: 180, laborCost: 150.00, partsCost: 45.75 },
            { machineId: machines[6].id, technicienId: techniciens[0].id, type: 'preventive', origin: 'scheduled', priority: 'low', status: 'completed', description: 'Inspection mensuelle convoyeur', resolution: 'RAS - Tension de bande ajustée, rouleaux en bon état.', dateReported: daysAgo(15), dateStarted: daysAgo(14), dateCompleted: daysAgo(14), actualDuration: 60, laborCost: 45.00, partsCost: 0 },
            { machineId: machines[9].id, technicienId: techniciens[1].id, type: 'preventive', origin: 'scheduled', priority: 'medium', status: 'completed', description: 'Contrôle annuel groupe électrogène', resolution: 'Test de charge effectué. Batterie remplacée par précaution.', dateReported: daysAgo(10), dateStarted: daysAgo(8), dateCompleted: daysAgo(8), actualDuration: 240, laborCost: 200.00, partsCost: 85.00 },
            { machineId: machines[5].id, technicienId: techniciens[2].id, type: 'corrective', origin: 'breakdown', priority: 'critical', severity: 'major', status: 'completed', description: 'Robot en erreur - axe 3 bloqué', resolution: 'Recalibration complète des axes. Capteur inductif remplacé.', dateReported: daysAgo(7), dateStarted: daysAgo(7), dateCompleted: daysAgo(6), actualDuration: 300, laborCost: 210.00, partsCost: 35.00, confirmedByTech: true, confirmedByTechAt: daysAgo(6) },

            // IN PROGRESS (5)
            { machineId: machines[2].id, technicienId: techniciens[0].id, type: 'corrective', origin: 'breakdown', priority: 'critical', severity: 'critical', status: 'in_progress', description: 'Fraiseuse ne démarre plus - disjoncteur déclenché', dateReported: hoursAgo(4), dateStarted: hoursAgo(2), estimatedDuration: 180 },
            { machineId: machines[4].id, technicienId: techniciens[2].id, type: 'preventive', origin: 'scheduled', priority: 'high', status: 'in_progress', description: 'Contrôle réglementaire pont roulant (annuel)', dateReported: daysAgo(2), dateStarted: hoursAgo(6), estimatedDuration: 480 },
            { machineId: machines[7].id, technicienId: techniciens[1].id, type: 'corrective', origin: 'breakdown', priority: 'high', severity: 'moderate', status: 'in_progress', description: 'Défaut de positionnement - pièces mal centrées', dateReported: daysAgo(1), dateStarted: hoursAgo(3), estimatedDuration: 120 },
            { machineId: machines[3].id, technicienId: techniciens[0].id, type: 'preventive', origin: 'scheduled', priority: 'medium', status: 'in_progress', description: 'Révision compresseur - changement filtres et vidange', dateReported: daysAgo(3), dateStarted: hoursAgo(1), estimatedDuration: 240 },
            { machineId: machines[8].id, technicienId: techniciens[2].id, type: 'inspection', origin: 'scheduled', priority: 'low', status: 'in_progress', description: 'Inspection sécurité chariot élévateur', dateReported: hoursAgo(5), dateStarted: hoursAgo(4), estimatedDuration: 60 },

            // ASSIGNED (4)
            { machineId: machines[0].id, technicienId: techniciens[1].id, type: 'preventive', origin: 'scheduled', priority: 'medium', status: 'assigned', description: 'Maintenance préventive Q2 - presse hydraulique', dateReported: daysAgo(1), scheduledDate: daysFromNow(2), estimatedDuration: 180 },
            { machineId: machines[6].id, technicienId: techniciens[0].id, type: 'corrective', origin: 'request', priority: 'low', severity: 'minor', status: 'assigned', description: 'Vibration anormale rouleau de sortie', dateReported: hoursAgo(8), scheduledDate: daysFromNow(1), estimatedDuration: 90 },
            { machineId: machines[9].id, technicienId: techniciens[3].id, type: 'inspection', origin: 'scheduled', priority: 'medium', status: 'assigned', description: 'Test de charge mensuel groupe électrogène', dateReported: daysAgo(2), scheduledDate: daysFromNow(3), estimatedDuration: 120 },
            { machineId: machines[1].id, technicienId: techniciens[1].id, type: 'preventive', origin: 'scheduled', priority: 'high', status: 'assigned', description: 'Remplacement préventif courroies (usure détectée)', dateReported: hoursAgo(12), scheduledDate: daysFromNow(1), estimatedDuration: 150 },

            // REPORTED (new, not assigned) (5)
            { machineId: machines[5].id, technicienId: null, type: 'corrective', origin: 'breakdown', priority: 'high', severity: 'moderate', status: 'reported', description: 'Bruit anormal moteur servo - axe 2', dateReported: hoursAgo(1), estimatedDuration: 120 },
            { machineId: machines[4].id, technicienId: null, type: 'corrective', origin: 'request', priority: 'medium', severity: 'minor', status: 'reported', description: 'Voyant défaut allumé sur tableau de commande', dateReported: hoursAgo(2), estimatedDuration: 60 },
            { machineId: machines[7].id, technicienId: null, type: 'inspection', origin: 'request', priority: 'low', status: 'reported', description: 'Demande d\'inspection suite changement opérateur', dateReported: hoursAgo(3), estimatedDuration: 45 },
            { machineId: machines[2].id, technicienId: null, type: 'corrective', origin: 'breakdown', priority: 'critical', severity: 'critical', status: 'reported', description: 'Fuite hydraulique importante détectée sous la machine', dateReported: hoursAgo(0.5), estimatedDuration: 180 },
            { machineId: machines[8].id, technicienId: null, type: 'preventive', origin: 'scheduled', priority: 'medium', status: 'reported', description: 'Révision annuelle chariot - échéance proche', dateReported: daysAgo(1), scheduledDate: daysFromNow(7), estimatedDuration: 300 },

            // CANCELLED (1)
            { machineId: machines[3].id, technicienId: techniciens[0].id, type: 'preventive', origin: 'scheduled', priority: 'low', status: 'cancelled', description: 'Maintenance préventive annulée - machine vendue', dateReported: daysAgo(5) },
        ];

        for (const wo of workOrderData) {
            await WorkOrder.findOrCreate({
                where: {
                    machineId: wo.machineId,
                    description: wo.description
                },
                defaults: wo,
            });
        }
        console.log('✅ Work orders created: 20 (5 completed, 5 in_progress, 4 assigned, 5 reported, 1 cancelled)\n');

        // ===============================
        // 9. STOCK MOVEMENTS
        // ===============================
        console.log('📦 Seeding stock movements...');
        const mouvementData = [
            // Entries
            { pieceId: pieces[0].id, type: 'entree', quantite: 20, quantiteAvant: 5, quantiteApres: 25, motif: 'Réapprovisionnement commande #CMD-2024-001', createdAt: daysAgo(25) },
            { pieceId: pieces[1].id, type: 'entree', quantite: 30, quantiteAvant: 20, quantiteApres: 50, motif: 'Réapprovisionnement commande #CMD-2024-002', createdAt: daysAgo(20) },
            { pieceId: pieces[4].id, type: 'entree', quantite: 50, quantiteAvant: 50, quantiteApres: 100, motif: 'Réapprovisionnement mensuel', createdAt: daysAgo(15) },
            { pieceId: pieces[5].id, type: 'entree', quantite: 100, quantiteAvant: 100, quantiteApres: 200, motif: 'Stock de sécurité fusibles', createdAt: daysAgo(12) },
            { pieceId: pieces[9].id, type: 'entree', quantite: 5, quantiteAvant: 5, quantiteApres: 10, motif: 'Commande huile hydraulique', createdAt: daysAgo(10) },

            // Exits (usage)
            { pieceId: pieces[0].id, type: 'sortie', quantite: 1, quantiteAvant: 26, quantiteApres: 25, motif: 'Utilisation WO-001 - Presse hydraulique', createdAt: daysAgo(28) },
            { pieceId: pieces[1].id, type: 'sortie', quantite: 2, quantiteAvant: 52, quantiteApres: 50, motif: 'Utilisation WO-002 - Tour CNC', createdAt: daysAgo(19) },
            { pieceId: pieces[2].id, type: 'sortie', quantite: 1, quantiteAvant: 31, quantiteApres: 30, motif: 'Utilisation WO-002 - Tour CNC', createdAt: daysAgo(19) },
            { pieceId: pieces[3].id, type: 'sortie', quantite: 2, quantiteAvant: 7, quantiteApres: 5, motif: 'Utilisation WO-005 - Robot soudure', createdAt: daysAgo(6) },
            { pieceId: pieces[8].id, type: 'sortie', quantite: 1, quantiteAvant: 4, quantiteApres: 3, motif: 'Utilisation WO-005 - Robot soudure', createdAt: daysAgo(6) },

            // More entries to show variety
            { pieceId: pieces[6].id, type: 'entree', quantite: 10, quantiteAvant: 5, quantiteApres: 15, motif: 'Commande urgente relais', createdAt: daysAgo(8) },
            { pieceId: pieces[10].id, type: 'entree', quantite: 10, quantiteAvant: 10, quantiteApres: 20, motif: 'Réapprovisionnement graisse', createdAt: daysAgo(5) },

            // Recent exits
            { pieceId: pieces[9].id, type: 'sortie', quantite: 2, quantiteAvant: 12, quantiteApres: 10, motif: 'Utilisation WO-004 - Groupe électrogène', createdAt: daysAgo(8) },
            { pieceId: pieces[11].id, type: 'sortie', quantite: 1, quantiteAvant: 3, quantiteApres: 2, motif: 'Utilisation urgente - fuite détectée', createdAt: daysAgo(2) },

            // Today's movements
            { pieceId: pieces[1].id, type: 'sortie', quantite: 1, quantiteAvant: 51, quantiteApres: 50, motif: 'Utilisation WO en cours - Compresseur', createdAt: hoursAgo(1) },
        ];

        for (const m of mouvementData) {
            await MouvementStock.create(m);
        }
        console.log('✅ Stock movements created: 15 (entries and exits)\n');

        // ===============================
        // 10. NOTIFICATIONS
        // ===============================
        console.log('🔔 Seeding notifications...');
        const notificationData = [
            { titre: 'Nouveau bon de travail urgent', message: 'Un bon de travail critique a été créé pour la Fraiseuse VM-200 - fuite hydraulique détectée.', type: 'alert', targetRole: 'technician', createdAt: hoursAgo(0.5) },
            { titre: 'Stock bas: Roulement RB-6205', message: 'Le stock de roulements RB-6205 est passé sous le seuil d\'alerte (5/10).', type: 'warning', targetRole: 'admin', createdAt: daysAgo(6) },
            { titre: 'Stock bas: Capteur inductif M12', message: 'Le stock de capteurs CAP-M12 est passé sous le seuil d\'alerte (3/5).', type: 'warning', targetRole: 'admin', createdAt: daysAgo(6) },
            { titre: 'Stock bas: Flexible hydraulique', message: 'Le stock de flexibles FLX-1M est critique (2/5). Commande recommandée.', type: 'alert', targetRole: 'admin', createdAt: daysAgo(2) },
            { titre: 'Maintenance préventive programmée', message: 'Rappel: Maintenance Q2 de la presse hydraulique prévue dans 2 jours.', type: 'info', targetRole: 'technician', createdAt: daysAgo(1) },
            { titre: 'Contrôle réglementaire à effectuer', message: 'Le contrôle annuel du pont roulant 10T doit être effectué cette semaine.', type: 'warning', targetRole: 'technician', createdAt: daysAgo(3) },
            { titre: 'Nouveau client ajouté', message: 'Le client "Logistique Express" a été ajouté au système.', type: 'success', targetRole: null, createdAt: daysAgo(10) },
            { titre: 'Mise à jour système', message: 'Une mise à jour du système GMAO est prévue ce weekend. Aucune interruption attendue.', type: 'info', targetRole: null, createdAt: daysAgo(5) },
            { titre: 'Rapport mensuel disponible', message: 'Le rapport d\'activité du mois dernier est maintenant disponible dans la section rapports.', type: 'success', targetRole: 'admin', createdAt: daysAgo(2) },
            { titre: 'Formation sécurité rappel', message: 'Rappel: La formation annuelle sécurité pour les techniciens aura lieu le 15 du mois.', type: 'warning', targetRole: 'technician', createdAt: daysAgo(7) },
        ];

        for (const n of notificationData) {
            await Notification.create(n);
        }
        console.log('✅ Notifications created: 10\n');

        // ===============================
        // SUMMARY
        // ===============================
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('📊 SUMMARY:');
        console.log('   ├── Roles: 4 (admin, technician, receptionist, user)');
        console.log('   ├── Users: 8 (1 admin, 2 receptionists, 4 technicians, 1 viewer)');
        console.log('   ├── Technician Profiles: 4');
        console.log('   ├── Clients: 5');
        console.log('   ├── Fournisseurs: 5');
        console.log('   ├── Pieces: 15 (3 with low stock alerts)');
        console.log('   ├── Machines: 10 (2 en panne, 1 en maintenance)');
        console.log('   ├── Work Orders: 20 (5 completed, 5 in_progress, 4 assigned, 5 reported, 1 cancelled)');
        console.log('   ├── Stock Movements: 15');
        console.log('   └── Notifications: 10\n');
        console.log('🔑 LOGIN CREDENTIALS:');
        console.log('   Admin:       admin@gmao.local / password123');
        console.log('   Technician:  tech1@gmao.local / password123');
        console.log('   Receptionist: reception@gmao.local / password123');
        console.log('   Viewer:      viewer@gmao.local / password123\n');

    } catch (error) {
        console.error('❌ Seeding error:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

seed();
