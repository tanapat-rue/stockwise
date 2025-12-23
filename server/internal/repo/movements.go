package repo

import (
	"context"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Stock Movements ---

func (r *Repo) CreateStockMovement(ctx context.Context, m models.StockMovement) (models.StockMovement, error) {
	m.CreatedAt = now()
	_, err := r.col(ColStockMovements).InsertOne(ctx, m)
	return m, err
}

func (r *Repo) ListStockMovementsByOrg(ctx context.Context, orgID string, filter bson.M, page, limit int) ([]models.StockMovement, int64, error) {
	filter["orgId"] = orgID

	total, err := r.col(ColStockMovements).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColStockMovements).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.StockMovement
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) GetStockMovement(ctx context.Context, orgID, id string) (models.StockMovement, error) {
	var m models.StockMovement
	err := r.col(ColStockMovements).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return models.StockMovement{}, ErrNotFound
	}
	return m, err
}

func (r *Repo) ListProductMovements(ctx context.Context, orgID, productID string, filter bson.M, page, limit int) ([]models.StockMovement, int64, error) {
	filter["orgId"] = orgID
	filter["productId"] = productID
	return r.ListStockMovementsByOrg(ctx, orgID, filter, page, limit)
}

// --- Stock Transfers ---

func (r *Repo) CreateStockTransfer(ctx context.Context, t models.StockTransfer) (models.StockTransfer, error) {
	t.CreatedAt = now()
	t.UpdatedAt = t.CreatedAt
	_, err := r.col(ColStockTransfers).InsertOne(ctx, t)
	return t, err
}

func (r *Repo) ListStockTransfersByOrg(ctx context.Context, orgID string, filter bson.M, page, limit int) ([]models.StockTransfer, int64, error) {
	filter["orgId"] = orgID

	total, err := r.col(ColStockTransfers).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColStockTransfers).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.StockTransfer
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) GetStockTransfer(ctx context.Context, orgID, id string) (models.StockTransfer, error) {
	var t models.StockTransfer
	err := r.col(ColStockTransfers).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&t)
	if err == mongo.ErrNoDocuments {
		return models.StockTransfer{}, ErrNotFound
	}
	return t, err
}

func (r *Repo) UpdateStockTransfer(ctx context.Context, orgID, id string, patch bson.M) (models.StockTransfer, error) {
	patch["updatedAt"] = now()
	res := r.col(ColStockTransfers).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.StockTransfer
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.StockTransfer{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeleteStockTransfer(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColStockTransfers).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Inventory Lots (extended) ---

func (r *Repo) ListInventoryLotsByOrg(ctx context.Context, orgID string, filter bson.M, page, limit int) ([]models.InventoryLot, int64, error) {
	filter["orgId"] = orgID

	total, err := r.col(ColInventoryLots).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "receivedAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColInventoryLots).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.InventoryLot
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) GetInventoryLot(ctx context.Context, orgID, id string) (models.InventoryLot, error) {
	var l models.InventoryLot
	err := r.col(ColInventoryLots).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&l)
	if err == mongo.ErrNoDocuments {
		return models.InventoryLot{}, ErrNotFound
	}
	return l, err
}

func (r *Repo) UpdateInventoryLot(ctx context.Context, orgID, id string, patch bson.M) (models.InventoryLot, error) {
	patch["updatedAt"] = now()
	res := r.col(ColInventoryLots).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.InventoryLot
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.InventoryLot{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) ListProductLots(ctx context.Context, orgID, productID, branchID string) ([]models.InventoryLot, error) {
	filter := bson.M{"orgId": orgID, "productId": productID}
	if branchID != "" {
		filter["branchId"] = branchID
	}

	opts := options.Find().SetSort(bson.D{{Key: "receivedAt", Value: 1}})
	cur, err := r.col(ColInventoryLots).Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.InventoryLot
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
