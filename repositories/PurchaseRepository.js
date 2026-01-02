/**
 * Ledger for successful transactions.
 */

class PurchaseRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Logs a completed purchase.
   */
  async create(data, trx = this.db) {
    await trx("purchases").insert(data);
  }

  /**
   * Retrieval by Provider ID
   */
  async getByProviderId(pid) {
    return this.db("purchases")
      .where({
        provider_order_id: pid,
      })
      .first();
  }

  /**
   * Lists user purchase history for billing views.
   */
  async listByUser(uid) {
    return this.db("purchases")
      .where({
        user_id: uid,
      })
      .orderBy("created_at", "desc");
  }
}

module.exports = PurchaseRepository;
