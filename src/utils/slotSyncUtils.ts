/**
 * Utilidades de slots simplificadas
 * Los slots se crean UNA VEZ al crear el anuncio y solo se bloquean/desbloquean individualmente
 */

export const SlotSyncUtils = {
  /**
   * NO-OP: Los slots ya no se regeneran automáticamente
   * Se mantiene por compatibilidad con código existente
   */
  async regenerateAllProviderSlots(_providerId: string, _reason = 'Manual trigger') {
    console.log('ℹ️ regenerateAllProviderSlots: NO-OP - los slots son estáticos');
    return 0;
  },

  /**
   * NO-OP: Validación deshabilitada
   */
  async validateSlotConsistency(_providerId: string, _listingId?: string) {
    return true;
  },

  /**
   * NO-OP: Cleanup deshabilitado
   */
  async cleanupOrphanedSlots(_providerId: string) {
    console.log('ℹ️ cleanupOrphanedSlots: NO-OP - deshabilitado');
    return true;
  },

  /**
   * NO-OP: Logging deshabilitado
   */
  async logSlotStatus(_providerId: string, _listingId?: string) {
    // No-op
  }
};
