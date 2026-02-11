import { jsPDF } from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Order } from "../data/mock-admin-data";

// Type definition for jsPDF with autoTable
interface JSPDFWithAutoTable extends jsPDF {
    lastAutoTable?: { finalY: number };
}

export const exportOrdersToExcel = (orders: Order[], currency: string = "DH") => {
    const data = orders.map(order => ({
        "N° Commande": order.orderNumber,
        "Client": order.customerName,
        "Téléphone": order.phone,
        "Ville": order.city,
        "Adresse": order.address,
        [`Total (${currency})`]: order.total,
        "Status": order.status,
        "Date": new Date(order.createdAt).toLocaleDateString(),
        "Produits": order.items.map(item => `${item.product?.name} (x${item.quantity})`).join(", ")
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");

    // Generate buffer and save
    XLSX.writeFile(workbook, `Commandes_MKARIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportOrdersToPDF = (orders: Order[], currency: string = "DH") => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Liste des Commandes - MKARIM SOLUTION", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ["N° Commande", "Client", "Ville", "Total", "Status", "Date"];
    const tableRows = orders.map(order => [
        order.orderNumber,
        order.customerName,
        order.city,
        `${order.total} ${currency}`,
        order.status,
        new Date(order.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [155, 135, 245] }
    });

    doc.save(`Commandes_MKARIM_${new Date().toISOString().split('T')[0]}.pdf`);
};



interface InvoiceSettings {
    invoiceFooterText?: string;
    invoiceShowTax?: boolean;
    invoiceTaxRate?: number;
    invoiceNotes?: string;
    logo?: string;
    invoiceSubtitle?: string;
    invoiceAddress?: string;
    invoiceCustomerHeader?: string;
}

const createInvoiceDoc = (order: Order, currency: string, settings?: InvoiceSettings) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text("FACTURE", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text("MKARIM SOLUTION", 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(settings?.invoiceSubtitle || "Vente de PC & Matériel Gaming", 14, 46);
    doc.text(settings?.invoiceAddress || "Maroc", 14, 51);

    // Invoice Info
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Facture N°: ${order.orderNumber}`, 140, 40);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 140, 46);
    doc.text(`Status: ${order.status.toUpperCase()}`, 140, 52);

    // Customer Info
    doc.line(14, 60, 196, 60);
    doc.setFontSize(14);
    doc.text(settings?.invoiceCustomerHeader || "Destinataire:", 14, 70);
    doc.setFontSize(11);
    doc.text(order.customerName, 14, 78);
    doc.text(order.phone, 14, 84);
    doc.text(`${order.address}, ${order.city}`, 14, 90);

    // Table
    const tableColumn = ["Produit", "Quantité", "Prix Unitaire", "Total"];
    const tableRows = order.items.map(item => [
        item.product?.name || "Produit Inconnu",
        item.quantity.toString(),
        `${item.price} ${currency}`,
        `${item.price * item.quantity} ${currency}`
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 100,
        theme: 'striped',
        headStyles: { fillColor: [155, 135, 245] },
        styles: { fontSize: 10 }
    });

    // Totals
    const finalYPos = (doc as JSPDFWithAutoTable).lastAutoTable?.finalY || 180;
    let currentY = finalYPos + 10;

    doc.setFontSize(12);

    if (settings?.invoiceShowTax) {
        const taxRate = settings.invoiceTaxRate || 20;
        const totalHT = order.total / (1 + (taxRate / 100));
        const totalTax = order.total - totalHT;

        doc.text(`Total HT: ${totalHT.toFixed(2)} ${currency}`, 140, currentY);
        currentY += 7;
        doc.text(`TVA (${taxRate}%): ${totalTax.toFixed(2)} ${currency}`, 140, currentY);
        currentY += 9;
    }

    doc.setFontSize(14);
    doc.text(`TOTAL TTC: ${order.total} ${currency}`, 140, currentY);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(settings?.invoiceFooterText || "Merci pour votre confiance !", 105, 280, { align: "center" });
    doc.text("MKARIM SOLUTION - www.mkarim.ma", 105, 285, { align: "center" });

    // Notes
    if (settings?.invoiceNotes) {
        doc.setFontSize(8);
        doc.text(settings.invoiceNotes, 14, 250);
    }

    return doc;
};

export const generateInvoicePDF = (order: Order, currency: string = "DH", settings?: InvoiceSettings) => {
    const doc = createInvoiceDoc(order, currency, settings);
    doc.save(`Facture_${order.orderNumber}.pdf`);
};

export const getInvoiceBlob = (order: Order, currency: string = "DH", settings?: InvoiceSettings) => {
    const doc = createInvoiceDoc(order, currency, settings);
    return doc.output('blob');
};


// Export customers to Excel
export const exportCustomersToExcel = (customers: any[], currency: string = "DH") => {
    const data = customers.map(customer => ({
        "Nom": customer.name,
        "Email": customer.email,
        "Téléphone": customer.phone,
        "Ville": customer.city,
        "Nombre de Commandes": customer.ordersCount,
        [`Total Dépensé (${currency})`]: customer.totalSpent,
        "Dernière Commande": new Date(customer.lastOrderDate).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

    XLSX.writeFile(workbook, `Clients_MKARIM_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export customers to PDF
export const exportCustomersToPDF = (customers: any[], currency: string = "DH") => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Liste des Clients - MKARIM SOLUTION", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

    const tableColumn = ["Nom", "Email", "Téléphone", "Ville", "Commandes", `Total (${currency})`];
    const tableRows = customers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.city,
        customer.ordersCount.toString(),
        customer.totalSpent.toLocaleString()
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [155, 135, 245] }
    });

    doc.save(`Clients_MKARIM_${new Date().toISOString().split('T')[0]}.pdf`);
};


const createWholesaleInvoiceDoc = (order: any, currency: string, settings?: InvoiceSettings) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text("FACTURE", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.text("MKARIM SOLUTION", 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(settings?.invoiceSubtitle || "Vente de PC & Matériel Gaming", 14, 46);
    doc.text(settings?.invoiceAddress || "Maroc", 14, 51);

    // Invoice Info
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Facture N°: ${order.orderNumber}`, 140, 40);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 140, 46);

    // Wholesaler Info
    doc.line(14, 60, 196, 60);
    doc.setFontSize(14);
    doc.text(settings?.invoiceCustomerHeader || "Facture pour :", 14, 70);
    doc.setFontSize(11);
    doc.text(order.wholesaler.name, 14, 78);

    if (order.wholesaler.type === 'ENTREPRISE') {
        if (order.wholesaler.ice) {
            doc.text(`ICE: ${order.wholesaler.ice}`, 14, 84);
        }
    } else {
        doc.text(order.wholesaler.phone, 14, 84);
    }

    // Table calculation
    const taxRate = settings?.invoiceTaxRate || 20;
    const factor = 1 + (taxRate / 100);

    // Table
    const tableColumn = ["Produit", "Quantité", "Prix Unitaire HT", "Total HT"];
    const tableRows = order.items.map((item: any) => {
        const unitPriceHT = item.unitPrice / factor;
        const totalHT = (item.unitPrice * item.quantity) / factor;
        return [
            item.product?.name || "Produit Inconnu",
            item.quantity.toString(),
            `${unitPriceHT.toFixed(2)} ${currency}`,
            `${totalHT.toFixed(2)} ${currency}`
        ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 105,
        theme: 'striped',
        headStyles: { fillColor: [155, 135, 245] },
        styles: { fontSize: 10 }
    });

    // Totals
    const finalYPos = (doc as JSPDFWithAutoTable).lastAutoTable?.finalY || 180;
    let currentY = finalYPos + 10;

    doc.setFontSize(12);

    if (settings?.invoiceShowTax) {
        const taxRate = settings.invoiceTaxRate || 20;
        const totalHT = order.totalAmount / (1 + (taxRate / 100));
        const totalTax = order.totalAmount - totalHT;

        doc.text(`Total HT: ${totalHT.toFixed(2)} ${currency}`, 140, currentY);
        currentY += 7;
        doc.text(`TVA (${taxRate}%): ${totalTax.toFixed(2)} ${currency}`, 140, currentY);
        currentY += 9;
    }

    doc.setFontSize(14);
    doc.text(`TOTAL TTC: ${order.totalAmount} ${currency}`, 140, currentY);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(settings?.invoiceFooterText || "Merci pour votre partenariat !", 105, 280, { align: "center" });
    doc.text("MKARIM SOLUTION - www.mkarim.ma", 105, 285, { align: "center" });

    // Notes
    if (settings?.invoiceNotes) {
        doc.setFontSize(8);
        doc.text(settings.invoiceNotes, 14, 250);
    }

    return doc;
};

// Export wholesale invoice to PDF
export const generateWholesaleInvoicePDF = (order: any, currency: string = "DH", settings?: InvoiceSettings) => {
    const doc = createWholesaleInvoiceDoc(order, currency, settings);
    doc.save(`Facture_Grossiste_${order.orderNumber}.pdf`);
};

export const getWholesaleInvoiceBlob = (order: any, currency: string = "DH", settings?: InvoiceSettings) => {
    const doc = createWholesaleInvoiceDoc(order, currency, settings);
    return doc.output('blob');
};
