import { describe, expect, it } from 'vitest';
import {
  auditActionLabel,
  auditChanges,
  entityTypeLabel,
  formatAuditValue,
} from '../../src/utils/auditLabels.js';

describe('auditLabels', () => {
  it('traduce acciones y tipos', () => {
    expect(auditActionLabel('role_change')).toBe('Cambio de rol');
    expect(auditActionLabel('delete')).toBe('Baja');
    expect(entityTypeLabel('store_book')).toBe('Inventario');
    expect(entityTypeLabel('otro')).toBe('otro');
  });

  it('auditChanges: solo lo que cambia, sin campos técnicos', () => {
    expect(
      auditChanges(
        { _id: '1', role: 'user', status: 'active', updated_at: 'a' },
        { _id: '1', role: 'admin', status: 'active', updated_at: 'b' },
      ),
    ).toEqual([{ field: 'role', before: 'user', after: 'admin' }]);
  });

  it('en altas y bajas lista todos los campos', () => {
    expect(auditChanges(null, { name: 'A', stock: 2 })).toEqual([
      { field: 'name', before: undefined, after: 'A' },
      { field: 'stock', before: undefined, after: 2 },
    ]);
    expect(auditChanges({ title: 'B' }, null)).toEqual([
      { field: 'title', before: 'B', after: undefined },
    ]);
    expect(auditChanges({ tags: ['a'] }, { tags: ['a'] })).toEqual([]);
  });

  it('formatAuditValue', () => {
    expect(formatAuditValue(null)).toBe('—');
    expect(formatAuditValue('')).toBe('—');
    expect(formatAuditValue(true)).toBe('sí');
    expect(formatAuditValue({ a: 1 })).toBe('{"a":1}');
    expect(formatAuditValue(0)).toBe('0');
  });
});
