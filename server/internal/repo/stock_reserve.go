package repo

import (
	"context"
	"fmt"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (r *Repo) ReserveStock(ctx context.Context, orgID, branchID, productID string, qty int) (models.StockLevel, error) {
	if qty <= 0 {
		return models.StockLevel{}, fmt.Errorf("qty must be > 0")
	}

	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{
			"_id":   StockLevelID(branchID, productID),
			"orgId": orgID,
			"$expr": bson.M{
				"$gte": bson.A{
					bson.M{"$subtract": bson.A{"$quantity", bson.M{"$ifNull": bson.A{"$reserved", 0}}}},
					qty,
				},
			},
		},
		bson.M{
			"$inc": bson.M{
				"reserved": qty,
				"version":  1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.StockLevel
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.StockLevel{}, ErrInsufficientStock
	}
	return out, err
}

func (r *Repo) ReleaseReservedStock(ctx context.Context, orgID, branchID, productID string, qty int) (models.StockLevel, error) {
	if qty <= 0 {
		return models.StockLevel{}, fmt.Errorf("qty must be > 0")
	}

	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{
			"_id":   StockLevelID(branchID, productID),
			"orgId": orgID,
			"$expr": bson.M{
				"$gte": bson.A{
					bson.M{"$ifNull": bson.A{"$reserved", 0}},
					qty,
				},
			},
		},
		bson.M{
			"$inc": bson.M{
				"reserved": -qty,
				"version":  1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var out models.StockLevel
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.StockLevel{}, ErrConflict
	}
	return out, err
}

func (r *Repo) CommitReservedStock(ctx context.Context, orgID, branchID, productID string, qty int) (models.StockLevel, error) {
	if qty <= 0 {
		return models.StockLevel{}, fmt.Errorf("qty must be > 0")
	}

	res := r.col(ColStockLevels).FindOneAndUpdate(
		ctx,
		bson.M{
			"_id":      StockLevelID(branchID, productID),
			"orgId":    orgID,
			"quantity": bson.M{"$gte": qty},
			"$expr": bson.M{
				"$gte": bson.A{
					bson.M{"$ifNull": bson.A{"$reserved", 0}},
					qty,
				},
			},
		},
		bson.M{
			"$inc": bson.M{
				"reserved": -qty,
				"quantity": -qty,
				"version":  1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)

	var out models.StockLevel
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.StockLevel{}, ErrConflict
	}
	return out, err
}

func (r *Repo) UncommitReservedStock(ctx context.Context, orgID, branchID, productID string, qty int) error {
	if qty <= 0 {
		return fmt.Errorf("qty must be > 0")
	}
	_, err := r.col(ColStockLevels).UpdateOne(
		ctx,
		bson.M{"_id": StockLevelID(branchID, productID), "orgId": orgID},
		bson.M{
			"$inc": bson.M{
				"reserved": qty,
				"quantity": qty,
				"version":  1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
	)
	return err
}
