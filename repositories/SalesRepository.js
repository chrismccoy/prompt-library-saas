/**
 * Promo code and coupon validation.
 */

class SalesRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Lists all coupons for management.
   */
  async listCoupons() {
    return this.db("coupons").orderBy("created_at", "desc");
  }

  /**
   * Creates a new marketing coupon.
   */
  async createCoupon({ code, discount_percent, expires_at }) {
    return this.db("coupons").insert({
      code: code.toUpperCase().trim(),
      discount_percent,
      expires_at: expires_at || null,
      active: true,
    });
  }

  /**
   * Removes a coupon.
   */
  async deleteCoupon(id) {
    return this.db("coupons").where({ id }).del();
  }

  /**
   * Validates code against active state and expiration.
   */
  async findValidCoupon(code) {
    if (!code) {
      return null;
    }

    return this.db("coupons")
      .where({
        code: code.toUpperCase().trim(),
        active: true,
      })
      .andWhere(function () {
        this.whereNull("expires_at").orWhere("expires_at", ">", new Date());
      })
      .first();
  }
}

module.exports = SalesRepository;
