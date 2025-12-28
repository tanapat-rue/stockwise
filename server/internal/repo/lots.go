package repo

import (
	"context"
	"fmt"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (r *Repo) CreateInventoryLot(ctx context.Context, lot models.InventoryLot) (models.InventoryLot, error) {
	lot.CreatedAt = now()
	lot.UpdatedAt = lot.CreatedAt
	lot.Version = 1 // Initialize version for optimistic locking
	if lot.ReceivedAt.IsZero() {
		lot.ReceivedAt = lot.CreatedAt
	}
	if lot.QtyRemaining == 0 {
		lot.QtyRemaining = lot.QtyReceived
	}
	_, err := r.col(ColInventoryLots).InsertOne(ctx, lot)
	return lot, err
}

func (r *Repo) DeleteInventoryLot(ctx context.Context, lotID string) error {
	res, err := r.col(ColInventoryLots).DeleteOne(ctx, bson.M{"_id": lotID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) FindOldestOpenLot(ctx context.Context, orgID, branchID, productID string) (models.InventoryLot, error) {
	var lot models.InventoryLot
	err := r.col(ColInventoryLots).FindOne(
		ctx,
		bson.M{
			"orgId":        orgID,
			"branchId":     branchID,
			"productId":    productID,
			"qtyRemaining": bson.M{"$gt": 0},
		},
		options.FindOne().SetSort(bson.D{{Key: "receivedAt", Value: 1}, {Key: "_id", Value: 1}}),
	).Decode(&lot)
	if err == mongo.ErrNoDocuments {
		return models.InventoryLot{}, ErrNotFound
	}
	return lot, err
}

func (r *Repo) DecrementLotRemaining(ctx context.Context, lotID string, qty int) (models.InventoryLot, bool, error) {
	if qty <= 0 {
		return models.InventoryLot{}, false, fmt.Errorf("qty must be > 0")
	}
	res := r.col(ColInventoryLots).FindOneAndUpdate(
		ctx,
		bson.M{"_id": lotID, "qtyRemaining": bson.M{"$gte": qty}},
		bson.M{
			"$inc": bson.M{
				"qtyRemaining": -qty,
				"version":      1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.InventoryLot
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.InventoryLot{}, false, nil
	}
	return out, true, err
}

func (r *Repo) IncrementLotRemaining(ctx context.Context, lotID string, qty int) error {
	if qty <= 0 {
		return fmt.Errorf("qty must be > 0")
	}
	_, err := r.col(ColInventoryLots).UpdateOne(
		ctx,
		bson.M{"_id": lotID},
		bson.M{
			"$inc": bson.M{
				"qtyRemaining": qty,
				"version":      1,
			},
			"$set": bson.M{"updatedAt": now()},
		},
	)
	return err
}

// ConsumeLotsFIFO decrements open lots (qtyRemaining) in FIFO order and returns the cost lines and total COGS.
func (r *Repo) ConsumeLotsFIFO(ctx context.Context, orgID, branchID, productID string, qty int) ([]models.CostLine, int64, error) {
	if qty <= 0 {
		return nil, 0, fmt.Errorf("qty must be > 0")
	}

	remaining := qty
	lines := make([]models.CostLine, 0, 4)
	var total int64

	for remaining > 0 {
		lot, err := r.FindOldestOpenLot(ctx, orgID, branchID, productID)
		if err != nil {
			// Rollback already-consumed lots best-effort.
			for _, l := range lines {
				_ = r.IncrementLotRemaining(ctx, l.LotID, l.Quantity)
			}
			if err == ErrNotFound {
				return nil, 0, fmt.Errorf("%w: product %s", ErrInsufficientLots, productID)
			}
			return nil, 0, err
		}

		consume := remaining
		if lot.QtyRemaining < consume {
			consume = lot.QtyRemaining
		}

		_, ok, err := r.DecrementLotRemaining(ctx, lot.ID, consume)
		if err != nil {
			for _, l := range lines {
				_ = r.IncrementLotRemaining(ctx, l.LotID, l.Quantity)
			}
			return nil, 0, err
		}
		if !ok {
			// Race: retry by re-fetching oldest lot.
			continue
		}

		amount := int64(consume) * lot.UnitCost
		lines = append(lines, models.CostLine{
			ProductID: productID,
			LotID:     lot.ID,
			Quantity:  consume,
			UnitCost:  lot.UnitCost,
			Amount:    amount,
		})
		total += amount
		remaining -= consume
	}

	return lines, total, nil
}
