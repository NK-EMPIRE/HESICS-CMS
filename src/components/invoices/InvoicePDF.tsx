import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice, Quotation, Organization } from '../../lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B00',
    paddingBottom: 12,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  brandTagline: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  titleContainer: {
    textAlign: 'right',
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  docNumber: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 4,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  billBox: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  entityName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  text: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 2,
  },
  table: {
    width: '100%',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: 8,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    padding: 8,
    alignItems: 'center',
  },
  colDesc: { width: '55%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colAmount: { width: '15%', textAlign: 'right' },
  totals: {
    width: '40%',
    marginLeft: 'auto',
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 6,
    marginTop: 4,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
});

interface PDFProps {
  data: Invoice | Quotation;
  org: Organization;
  type: 'invoice' | 'quotation';
}

export const InvoicePDFDocument: React.FC<PDFProps> = ({ data, org, type }) => {
  const isInvoice = type === 'invoice';
  const docNumber = isInvoice ? (data as Invoice).invoice_number : (data as Quotation).quote_number;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{org.name}</Text>
            <Text style={styles.brandTagline}>Business Operating System & Advisory</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.docTitle}>{isInvoice ? 'TAX INVOICE' : 'QUOTATION'}</Text>
            <Text style={styles.docNumber}>#{docNumber}</Text>
            <Text style={styles.text}>Date: {data.created_at.split('T')[0]}</Text>
          </View>
        </View>

        {/* Sender & Recipient Details */}
        <View style={styles.section}>
          <View style={styles.billBox}>
            <Text style={styles.boxTitle}>Issued By</Text>
            <Text style={styles.entityName}>{org.name}</Text>
            <Text style={styles.text}>GSTIN: {org.gstin || '33AAAAA0000A1Z5'}</Text>
            <Text style={styles.text}>Entity: {org.entity_type || 'Pvt Ltd'}</Text>
          </View>

          <View style={styles.billBox}>
            <Text style={styles.boxTitle}>Billed To</Text>
            <Text style={styles.entityName}>{data.client_name || 'Client'}</Text>
            <Text style={styles.text}>Email: {data.client_email || 'n/a'}</Text>
          </View>
        </View>

        {/* Table of Line Items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount (₹)</Text>
          </View>

          {data.line_items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>₹{item.unit_price.toLocaleString('en-IN')}</Text>
              <Text style={styles.colAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.text}>Subtotal:</Text>
            <Text style={styles.text}>₹{data.subtotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.text}>GST (18%):</Text>
            <Text style={styles.text}>₹{data.tax.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>Total Payable:</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
              ₹{data.total.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for doing business with {org.name}. Computer generated document.</Text>
        </View>
      </Page>
    </Document>
  );
};
