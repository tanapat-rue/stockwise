package repo

import (
	"context"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Transactions / Orders ---

func (r *Repo) CreateTransaction(ctx context.Context, t models.Transaction) (models.Transaction, error) {
	t.CreatedAt = now()
	t.UpdatedAt = t.CreatedAt
	_, err := r.col(ColTransactions).InsertOne(ctx, t)
	return t, err
}

func (r *Repo) ListTransactionsByOrg(ctx context.Context, orgID string) ([]models.Transaction, error) {
	cur, err := r.col(ColTransactions).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Transaction
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetTransaction(ctx context.Context, id string) (models.Transaction, error) {
	var t models.Transaction
	err := r.col(ColTransactions).FindOne(ctx, bson.M{"_id": id}).Decode(&t)
	if err == mongo.ErrNoDocuments {
		return models.Transaction{}, ErrNotFound
	}
	return t, err
}

func (r *Repo) GetTransactionByOrg(ctx context.Context, orgID, id string) (models.Transaction, error) {
	var t models.Transaction
	err := r.col(ColTransactions).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&t)
	if err == mongo.ErrNoDocuments {
		return models.Transaction{}, ErrNotFound
	}
	return t, err
}

func (r *Repo) UpdateTransaction(ctx context.Context, id string, patch bson.M) (models.Transaction, error) {
	patch["updatedAt"] = now()
	res := r.col(ColTransactions).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Transaction
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Transaction{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdateTransactionByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Transaction, error) {
	patch["updatedAt"] = now()
	res := r.col(ColTransactions).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Transaction
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Transaction{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) LockTransactionForStockCommit(ctx context.Context, orgID, id string) (models.Transaction, error) {
	res := r.col(ColTransactions).FindOneAndUpdate(
		ctx,
		bson.M{
			"_id":                  id,
			"orgId":                orgID,
			"stockCommitted":       bson.M{"$ne": true},
			"stockCommitInProgress": bson.M{"$ne": true},
		},
		bson.M{"$set": bson.M{"stockCommitInProgress": true, "updatedAt": now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Transaction
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Transaction{}, ErrConflict
	}
	return out, err
}

func (r *Repo) UnlockTransactionStockCommit(ctx context.Context, orgID, id string) error {
	_, err := r.col(ColTransactions).UpdateOne(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": bson.M{"stockCommitInProgress": false, "updatedAt": now()}},
	)
	return err
}

func (r *Repo) BulkUpdateTransactions(ctx context.Context, ids []string, patch bson.M) (int64, error) {
	patch["updatedAt"] = now()
	res, err := r.col(ColTransactions).UpdateMany(
		ctx,
		bson.M{"_id": bson.M{"$in": ids}},
		bson.M{"$set": patch},
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

func (r *Repo) BulkUpdateTransactionsByOrg(ctx context.Context, orgID string, ids []string, patch bson.M) (int64, error) {
	patch["updatedAt"] = now()
	res, err := r.col(ColTransactions).UpdateMany(
		ctx,
		bson.M{"_id": bson.M{"$in": ids}, "orgId": orgID},
		bson.M{"$set": patch},
	)
	if err != nil {
		return 0, err
	}
	return res.ModifiedCount, nil
}

func (r *Repo) DeleteTransactionByOrg(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColTransactions).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}
