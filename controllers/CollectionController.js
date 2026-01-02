/**
 * Manages user folders, playlists, and follows.
 */

const { AppError } = require("../utils/AppError");

class CollectionController {
  constructor(collectionRepo) {
    this.repo = collectionRepo;
  }

  /**
   * Show user's owned and followed collections.
   */
  index = async (req, res) => {
    const userId = res.locals.currentUser.id;

    const [collections, followed] = await Promise.all([
      this.repo.listByUser(userId),
      this.repo.getFollowedByUser(userId),
    ]);

    res.render("pages/dashboard/collections", {
      title: "My Collections",
      collections,
      followed,
    });
  };

  /**
   * Show all community-shared playlists.
   */
  listPublic = async (req, res) => {
    const playlists = await this.repo.listPublic(20);

    res.render("pages/community/playlists", {
      title: "Community Playlists",
      playlists,
    });
  };

  /**
   * Creates a new organization folder.
   */
  create = async (req, res) => {
    const { name, is_public } = req.body;
    const userId = res.locals.currentUser.id;

    await this.repo.create(userId, name, is_public === "true");

    req.session.flash = {
      type: "success",
      message: "New collection successfully created.",
    };

    res.redirect("/dashboard/collections");
  };

  /**
   * Show contents of a specific folder.
   */
  show = async (req, res) => {
    const userId = res.locals.currentUser.id;
    const { slug } = req.params;

    const collection = await this.repo.getBySlug(userId, slug);

    if (!collection) {
      throw new AppError(
        "We couldn't find that collection in your account.",
        404
      );
    }

    res.render("pages/dashboard/collection-detail", {
      title: collection.name,
      collection,
    });
  };

  /**
   * Show contents of a curated playlist.
   */
  showPublic = async (req, res) => {
    const { slug } = req.params;

    const collection = await this.repo.getPublicBySlug(slug);

    if (!collection) {
      throw new AppError(
        "Playlist not found or it has been set to private.",
        404
      );
    }

    let isFollowing = false;
    if (res.locals.currentUser) {
      const followed = await this.repo.getFollowedByUser(
        res.locals.currentUser.id
      );
      isFollowing = followed.some((f) => f.id === collection.id);
    }

    res.render("pages/community/playlist-detail", {
      title: collection.name,
      collection,
      isFollowing,
    });
  };

  /**
   * Toggle subscription to a playlist.
   */
  toggleFollow = async (req, res) => {
    const { id } = req.params;
    const userId = res.locals.currentUser.id;

    const isFollowing = await this.repo.toggleFollow(userId, id);

    res.json({ isFollowing });
  };

  /**
   * Add a prompt to a user-owned folder.
   */
  addItem = async (req, res) => {
    const { collectionId, promptId } = req.body;
    const userId = res.locals.currentUser.id;

    const collections = await this.repo.listByUser(userId);
    const owned = collections.find((c) => c.id === parseInt(collectionId));

    if (!owned) {
      throw new AppError(
        "You do not have permission to modify this collection.",
        403
      );
    }

    await this.repo.addItem(collectionId, promptId);

    req.session.flash = {
      type: "success",
      message: "Prompt added to your collection.",
    };

    res.redirect("back");
  };

  /**
   * Removes a prompt link from a folder.
   */
  removeItem = async (req, res) => {
    const { id, promptId } = req.params;

    await this.repo.removeItem(id, promptId);

    res.redirect("back");
  };

  /**
   * Deletes a folder
   */
  delete = async (req, res) => {
    const { id } = req.params;
    const userId = res.locals.currentUser.id;

    await this.repo.delete(userId, id);

    req.session.flash = {
      type: "success",
      message: "Collection folder removed.",
    };

    res.redirect("/dashboard/collections");
  };
}

module.exports = CollectionController;
