/**
 * Lead capture and subscription management.
 */

class NewsletterRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Subscribes an email address.
   */
  async subscribe(email) {
    return this.db("newsletter_subscribers")
      .insert({
        email: email.toLowerCase().trim(),
        created_at: new Date(),
      })
      .onConflict("email")
      .ignore();
  }

  /**
   * Lists subscribers for export.
   */
  async listSubscribers() {
    return this.db("newsletter_subscribers").orderBy("created_at", "desc");
  }
}

module.exports = NewsletterRepository;
