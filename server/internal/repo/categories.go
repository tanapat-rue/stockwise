package repo

import (
	"context"
	"regexp"
	"strings"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Categories ---

func (r *Repo) CreateCategory(ctx context.Context, c models.Category) (models.Category, error) {
	c.CreatedAt = now()
	c.UpdatedAt = c.CreatedAt
	_, err := r.col(ColCategories).InsertOne(ctx, c)
	return c, err
}

func (r *Repo) ListCategoriesByOrg(ctx context.Context, orgID string, filter bson.M) ([]models.Category, error) {
	query := bson.M{"orgId": orgID}
	for k, v := range filter {
		query[k] = v
	}

	opts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "name", Value: 1}})
	cur, err := r.col(ColCategories).Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Category
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetCategory(ctx context.Context, id string) (models.Category, error) {
	var c models.Category
	err := r.col(ColCategories).FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return models.Category{}, ErrNotFound
	}
	return c, err
}

func (r *Repo) GetCategoryByOrg(ctx context.Context, orgID, id string) (models.Category, error) {
	var c models.Category
	err := r.col(ColCategories).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return models.Category{}, ErrNotFound
	}
	return c, err
}

func (r *Repo) GetCategoryBySlug(ctx context.Context, orgID, slug string) (models.Category, error) {
	var c models.Category
	err := r.col(ColCategories).FindOne(ctx, bson.M{"slug": slug, "orgId": orgID}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return models.Category{}, ErrNotFound
	}
	return c, err
}

func (r *Repo) UpdateCategory(ctx context.Context, id string, patch bson.M) (models.Category, error) {
	patch["updatedAt"] = now()
	res := r.col(ColCategories).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Category
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Category{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdateCategoryByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Category, error) {
	patch["updatedAt"] = now()
	res := r.col(ColCategories).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Category
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Category{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeleteCategory(ctx context.Context, id string) error {
	res, err := r.col(ColCategories).DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) DeleteCategoryByOrg(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColCategories).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateCategoriesByPath updates all categories whose path starts with oldPathPrefix
// Used when moving/renaming parent categories
func (r *Repo) UpdateCategoriesByPath(ctx context.Context, orgID, oldPathPrefix, newPathPrefix string) error {
	filter := bson.M{
		"orgId": orgID,
		"path":  bson.M{"$regex": "^" + regexp.QuoteMeta(oldPathPrefix)},
	}

	cur, err := r.col(ColCategories).Find(ctx, filter)
	if err != nil {
		return err
	}
	defer cur.Close(ctx)

	var cats []models.Category
	if err := cur.All(ctx, &cats); err != nil {
		return err
	}

	for _, cat := range cats {
		newPath := strings.Replace(cat.Path, oldPathPrefix, newPathPrefix, 1)
		_, err := r.col(ColCategories).UpdateOne(
			ctx,
			bson.M{"_id": cat.ID},
			bson.M{"$set": bson.M{"path": newPath, "updatedAt": now()}},
		)
		if err != nil {
			return err
		}
	}

	return nil
}

// CountProductsByCategory counts products in a category
func (r *Repo) CountProductsByCategory(ctx context.Context, orgID, categoryID string) (int64, error) {
	return r.col(ColProducts).CountDocuments(ctx, bson.M{
		"orgId":      orgID,
		"categoryId": categoryID,
	})
}

// BulkUpdateCategorySortOrder updates sort order for multiple categories
func (r *Repo) BulkUpdateCategorySortOrder(ctx context.Context, orgID string, orders []struct {
	ID        string
	SortOrder int
}) error {
	for _, o := range orders {
		_, err := r.col(ColCategories).UpdateOne(
			ctx,
			bson.M{"_id": o.ID, "orgId": orgID},
			bson.M{"$set": bson.M{"sortOrder": o.SortOrder, "updatedAt": now()}},
		)
		if err != nil {
			return err
		}
	}
	return nil
}
