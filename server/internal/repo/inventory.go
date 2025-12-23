package repo

import (
	"context"
	"fmt"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Products ---

func (r *Repo) CreateProduct(ctx context.Context, p models.Product) (models.Product, error) {
	p.CreatedAt = now()
	p.UpdatedAt = p.CreatedAt
	_, err := r.col(ColProducts).InsertOne(ctx, p)
	return p, err
}

func (r *Repo) ListProductsByOrg(ctx context.Context, orgID string) ([]models.Product, error) {
	cur, err := r.col(ColProducts).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Product
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetProduct(ctx context.Context, id string) (models.Product, error) {
	var p models.Product
	err := r.col(ColProducts).FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return models.Product{}, ErrNotFound
	}
	return p, err
}

func (r *Repo) GetProductByOrg(ctx context.Context, orgID, id string) (models.Product, error) {
	var p models.Product
	err := r.col(ColProducts).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return models.Product{}, ErrNotFound
	}
	return p, err
}

func (r *Repo) UpdateProduct(ctx context.Context, id string, patch bson.M) (models.Product, error) {
	patch["updatedAt"] = now()
	res := r.col(ColProducts).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Product
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Product{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdateProductByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Product, error) {
	patch["updatedAt"] = now()
	res := r.col(ColProducts).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Product
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Product{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeleteProduct(ctx context.Context, id string) error {
	res, err := r.col(ColProducts).DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) DeleteProductByOrg(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColProducts).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Stock Levels ---

func StockLevelID(branchID, productID string) string {
	return fmt.Sprintf("%s:%s", branchID, productID)
}

func (r *Repo) ListStockLevelsByOrg(ctx context.Context, orgID string) ([]models.StockLevel, error) {
	cur, err := r.col(ColStockLevels).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.StockLevel
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetStockLevel(ctx context.Context, orgID, branchID, productID string) (models.StockLevel, error) {
	var s models.StockLevel
	err := r.col(ColStockLevels).FindOne(ctx, bson.M{"_id": StockLevelID(branchID, productID), "orgId": orgID}).Decode(&s)
	if err == mongo.ErrNoDocuments {
		return models.StockLevel{}, ErrNotFound
	}
	return s, err
}

func (r *Repo) UpsertStockLevel(ctx context.Context, s models.StockLevel) (models.StockLevel, error) {
	s.ID = StockLevelID(s.BranchID, s.ProductID)
	s.UpdatedAt = now()

	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{"_id": s.ID, "orgId": s.OrgID},
		bson.M{"$set": s},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	)
	var out models.StockLevel
	if err := res.Decode(&out); err != nil {
		return models.StockLevel{}, err
	}
	return out, nil
}

func (r *Repo) PatchStockLevel(ctx context.Context, orgID, branchID, productID string, patch bson.M) (models.StockLevel, error) {
	patch["updatedAt"] = now()
	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{"_id": StockLevelID(branchID, productID), "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.StockLevel
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.StockLevel{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) AdjustStock(ctx context.Context, orgID, branchID, productID string, delta int) (models.StockLevel, error) {
	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{"_id": StockLevelID(branchID, productID), "orgId": orgID},
		bson.M{
			"$setOnInsert": bson.M{
				"_id":       StockLevelID(branchID, productID),
				"orgId":     orgID,
				"branchId":  branchID,
				"productId": productID,
				"minStock":  5,
				"reserved":  0,
			},
			"$inc": bson.M{"quantity": delta},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	)
	var out models.StockLevel
	if err := res.Decode(&out); err != nil {
		return models.StockLevel{}, err
	}
	return out, nil
}
