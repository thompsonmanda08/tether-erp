import { StyleSheet } from '@react-pdf/renderer'

export const pdfStyles = StyleSheet.create({
  // Layout
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },

  // Header
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },

  companyInfo: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },

  companyDetails: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
  },

  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },

  documentNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },

  // Status badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 5,
  },

  statusDraft: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },

  statusSubmitted: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },

  statusInReview: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },

  statusApproved: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },

  statusRejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },

  statusPaid: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },

  // Section
  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    color: '#1f2937',
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },

  // Grid
  grid: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 10,
  },

  gridCol2: {
    flexDirection: 'row',
    width: '100%',
  },

  gridCol3: {
    flexDirection: 'row',
    width: '100%',
  },

  gridCol4: {
    flexDirection: 'row',
    width: '100%',
  },

  col: {
    paddingRight: 10,
    flex: 1,
  },

  col50: {
    flex: 1,
    paddingRight: 10,
    width: '50%',
  },

  col33: {
    flex: 1,
    paddingRight: 10,
    width: '33.33%',
  },

  col25: {
    flex: 1,
    paddingRight: 10,
    width: '25%',
  },

  // Info box
  infoBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },

  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  value: {
    fontSize: 10,
    color: '#1f2937',
    fontWeight: 'normal',
  },

  // Table
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },

  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  tableHeaderRow: {
    margin: 'auto',
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    fontWeight: 'bold',
  },

  tableCell: {
    margin: 'auto',
    padding: 8,
    fontSize: 9,
    flex: 1,
    color: '#1f2937',
  },

  tableHeaderCell: {
    margin: 'auto',
    padding: 8,
    fontSize: 9,
    flex: 1,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Totals
  totalsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#1e40af',
  },

  totalItem: {
    width: '40%',
  },

  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937',
  },

  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },

  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
  },

  // Approval
  approvalSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  approvalRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
  },

  approvalBox: {
    flex: 1,
    paddingRight: 10,
  },

  approvalStage: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  approvalName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
  },

  approvalStatus: {
    fontSize: 9,
    color: '#6b7280',
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginTop: 30,
    height: 40,
  },

  // Footer
  footer: {
    paddingTop: 20,
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },

  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },

  // Special
  highlighted: {
    backgroundColor: '#fef3c7',
    padding: 8,
    marginBottom: 10,
  },

  warning: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
})
