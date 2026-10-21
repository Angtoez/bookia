// Entrada inmutable de auditoría (principio VII, data-model § AuditLog, FR-028).
import mongoose from 'mongoose';
import { toJSONOptions } from '../utils/toJSON.js';

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'status_change', 'role_change'];
export const AUDIT_ENTITY_TYPES = ['book', 'store', 'store_book', 'user', 'reservation'];

const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entity_type: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    entity_label: { type: String, default: '' },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    collection: 'audit_logs',
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: toJSONOptions(),
  },
);

auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ entity_type: 1, created_at: -1 });

// La auditoría no se puede modificar ni borrar desde la aplicación.
const immutable = () => {
  throw new Error('audit_logs es inmutable');
};
const QUERY_OPERATIONS = [
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'findOneAndReplace',
  'deleteMany',
  'findOneAndDelete',
];
for (const op of QUERY_OPERATIONS) auditLogSchema.pre(op, immutable);
// updateOne y deleteOne existen como operación de consulta y de documento.
for (const op of ['updateOne', 'deleteOne']) {
  auditLogSchema.pre(op, { document: true, query: true }, immutable);
}
auditLogSchema.pre('save', function onlyInserts() {
  if (!this.isNew) immutable();
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
