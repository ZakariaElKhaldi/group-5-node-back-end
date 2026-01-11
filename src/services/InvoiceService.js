const PDFDocument = require('pdfkit');
const { WorkOrder, Machine, Technicien, Client, User } = require('../models');

/**
 * InvoiceService - Generate PDF invoices for work orders
 */
class InvoiceService {
    /**
     * Generate a PDF invoice for a work order
     * @param {number} workOrderId - The work order ID
     * @returns {Promise<Buffer>} - PDF buffer
     */
    static async generateInvoice(workOrderId) {
        // Fetch work order with all related data
        const workOrder = await WorkOrder.findByPk(workOrderId, {
            include: [
                {
                    model: Machine,
                    as: 'machine',
                    include: [{
                        model: Client,
                        as: 'client',
                    }],
                },
                {
                    model: Technicien,
                    as: 'technicien',
                    include: [{
                        model: User,
                        as: 'user',
                    }],
                },
            ],
        });

        if (!workOrder) {
            throw new Error('Work order not found');
        }

        // Create PDF document
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        doc.fontSize(24).fillColor('#1e3a8a').text('GMAO', { align: 'left' });
        doc.fontSize(10).fillColor('#64748b').text('Système de Gestion de Maintenance', { align: 'left' });

        doc.moveDown();
        doc.fontSize(20).fillColor('#0f172a').text('FACTURE', { align: 'right' });
        doc.fontSize(10).fillColor('#64748b').text(`N° ${workOrder.id.toString().padStart(6, '0')}`, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });

        doc.moveDown(2);

        // Horizontal line
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0');
        doc.moveDown();

        // Client info
        const client = workOrder.machine?.client;
        doc.fontSize(12).fillColor('#0f172a').text('Facturé à:', { underline: true });
        doc.fontSize(10).fillColor('#475569');
        if (client) {
            doc.text(client.nom || 'Client');
            doc.text(client.adresse || '');
            doc.text(`Email: ${client.email || 'N/A'}`);
            doc.text(`Tél: ${client.telephone || 'N/A'}`);
        } else {
            doc.text('Client non spécifié');
        }

        doc.moveDown(2);

        // Work order details
        doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'intervention:', { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 200;
        const col3 = 400;
        const col4 = 500;

        // Table header
        doc.fontSize(9).fillColor('#64748b');
        doc.text('Description', col1, tableTop);
        doc.text('Détail', col2, tableTop);
        doc.text('Qté', col3, tableTop);
        doc.text('Montant', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#e2e8f0');

        let currentY = tableTop + 25;

        // Machine info
        doc.fontSize(9).fillColor('#0f172a');
        doc.text('Machine', col1, currentY);
        doc.text(`${workOrder.machine?.modele || 'N/A'} (${workOrder.machine?.reference || 'N/A'})`, col2, currentY, { width: 180 });
        currentY += 20;

        // Type & Priority
        doc.text('Type d\'intervention', col1, currentY);
        doc.text(workOrder.type?.charAt(0).toUpperCase() + workOrder.type?.slice(1) || 'N/A', col2, currentY);
        currentY += 20;

        // Technician
        const techName = workOrder.technicien?.user
            ? `${workOrder.technicien.user.prenom || ''} ${workOrder.technicien.user.nom || ''}`.trim()
            : 'Non assigné';
        doc.text('Technicien', col1, currentY);
        doc.text(techName, col2, currentY);
        currentY += 20;

        // Duration
        if (workOrder.actualDuration) {
            doc.text('Durée', col1, currentY);
            doc.text(`${Math.round(workOrder.actualDuration / 60 * 10) / 10} heures`, col2, currentY);
            currentY += 20;
        }

        // Description
        if (workOrder.description) {
            doc.text('Description', col1, currentY);
            doc.text(workOrder.description.substring(0, 150), col2, currentY, { width: 300 });
            currentY += 30;
        }

        // Costs section
        currentY += 20;
        doc.moveTo(350, currentY).lineTo(545, currentY).stroke('#e2e8f0');
        currentY += 10;

        const laborCost = parseFloat(workOrder.laborCost) || 0;
        const partsCost = parseFloat(workOrder.partsCost) || 0;
        const subtotal = laborCost + partsCost;
        const tva = subtotal * 0.20; // 20% TVA
        const total = subtotal + tva;

        doc.fontSize(10).fillColor('#475569');
        doc.text('Main d\'œuvre:', 350, currentY);
        doc.text(`${laborCost.toFixed(2)} €`, col4, currentY);
        currentY += 18;

        doc.text('Pièces détachées:', 350, currentY);
        doc.text(`${partsCost.toFixed(2)} €`, col4, currentY);
        currentY += 18;

        doc.moveTo(350, currentY).lineTo(545, currentY).stroke('#e2e8f0');
        currentY += 10;

        doc.text('Sous-total HT:', 350, currentY);
        doc.text(`${subtotal.toFixed(2)} €`, col4, currentY);
        currentY += 18;

        doc.text('TVA (20%):', 350, currentY);
        doc.text(`${tva.toFixed(2)} €`, col4, currentY);
        currentY += 18;

        doc.moveTo(350, currentY).lineTo(545, currentY).stroke('#1e3a8a');
        currentY += 10;

        doc.fontSize(12).fillColor('#1e3a8a').font('Helvetica-Bold');
        doc.text('TOTAL TTC:', 350, currentY);
        doc.text(`${total.toFixed(2)} €`, col4, currentY);

        // Footer
        doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
        doc.text('Merci de votre confiance.', 50, 750, { align: 'center' });
        doc.text('GMAO - Système de Gestion de Maintenance Assistée par Ordinateur', 50, 765, { align: 'center' });

        doc.end();

        return new Promise((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
        });
    }
}

module.exports = InvoiceService;
