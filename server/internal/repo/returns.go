package repo

import (
	"context"
	"fmt"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// FormatReturnReference generates RMA reference number
func FormatReturnReference(seq int64) string {
	return fmt.Sprintf("RMA-%06d", seq)
}

// --- Returns CRUD ---

func (r *Repo) CreateReturn(ctx context.Context, ret models.Return) (models.Return, error) {
	ret.CreatedAt = now()
	ret.UpdatedAt = ret.CreatedAt
	if ret.RequestedAt.IsZero() {
		ret.RequestedAt = ret.CreatedAt
	}
	_, err := r.col(ColReturns).InsertOne(ctx, ret)
	return ret, err
}

func (r *Repo) ListReturnsByOrg(ctx context.Context, orgID string, filter bson.M, page, limit int) ([]models.Return, int64, error) {
	if filter == nil {
		filter = bson.M{}
	}
	filter["orgId"] = orgID

	total, err := r.col(ColReturns).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColReturns).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.Return
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repo) GetReturnByOrg(ctx context.Context, orgID, id string) (models.Return, error) {
	var ret models.Return
	err := r.col(ColReturns).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&ret)
	if err == mongo.ErrNoDocuments {
		return models.Return{}, ErrNotFound
	}
	return ret, err
}

func (r *Repo) UpdateReturnByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Return, error) {
	patch["updatedAt"] = now()
	res := r.col(ColReturns).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Return
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Return{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeleteReturnByOrg(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColReturns).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

// ListReturnsByOriginalOrder finds all returns linked to a specific order
func (r *Repo) ListReturnsByOriginalOrder(ctx context.Context, orgID, orderID string) ([]models.Return, error) {
	cur, err := r.col(ColReturns).Find(ctx, bson.M{
		"orgId":           orgID,
		"originalOrderId": orderID,
	})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Return
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

// ListReturnsByOriginalPO finds all returns linked to a specific purchase order
func (r *Repo) ListReturnsByOriginalPO(ctx context.Context, orgID, poID string) ([]models.Return, error) {
	cur, err := r.col(ColReturns).Find(ctx, bson.M{
		"orgId":                   orgID,
		"originalPurchaseOrderId": poID,
	})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Return
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
