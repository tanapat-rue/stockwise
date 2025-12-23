package repo

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Counter struct {
	ID  string `bson:"_id"`
	Seq int64  `bson:"seq"`
}

func (r *Repo) PeekCounter(ctx context.Context, id string) (int64, error) {
	var c Counter
	err := r.col(ColCounters).FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return 0, nil
	}
	return c.Seq, err
}

func (r *Repo) NextCounter(ctx context.Context, id string) (int64, error) {
	res := r.col(ColCounters).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$inc": bson.M{"seq": 1},
			"$set": bson.M{"updatedAt": now()},
		},
		options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After),
	)

	var out Counter
	if err := res.Decode(&out); err != nil {
		return 0, err
	}
	return out.Seq, nil
}

func FormatPurchaseOrderReference(seq int64) string {
	// Default format (editable by the user afterward): PO-000001
	return fmt.Sprintf("PO-%06d", seq)
}

