package repo

import (
	"context"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Purchase Orders ---

func (r *Repo) CreatePurchaseOrder(ctx context.Context, po models.PurchaseOrder) (models.PurchaseOrder, error) {
	po.CreatedAt = now()
	po.UpdatedAt = po.CreatedAt
	_, err := r.col(ColPurchaseOrders).InsertOne(ctx, po)
	return po, err
}

func (r *Repo) ListPurchaseOrdersByOrg(ctx context.Context, orgID string) ([]models.PurchaseOrder, error) {
	cur, err := r.col(ColPurchaseOrders).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.PurchaseOrder
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetPurchaseOrder(ctx context.Context, id string) (models.PurchaseOrder, error) {
	var po models.PurchaseOrder
	err := r.col(ColPurchaseOrders).FindOne(ctx, bson.M{"_id": id}).Decode(&po)
	if err == mongo.ErrNoDocuments {
		return models.PurchaseOrder{}, ErrNotFound
	}
	return po, err
}

func (r *Repo) GetPurchaseOrderByOrg(ctx context.Context, orgID, id string) (models.PurchaseOrder, error) {
	var po models.PurchaseOrder
	err := r.col(ColPurchaseOrders).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&po)
	if err == mongo.ErrNoDocuments {
		return models.PurchaseOrder{}, ErrNotFound
	}
	return po, err
}

func (r *Repo) UpdatePurchaseOrder(ctx context.Context, id string, patch bson.M) (models.PurchaseOrder, error) {
	patch["updatedAt"] = now()
	res := r.col(ColPurchaseOrders).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.PurchaseOrder
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.PurchaseOrder{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdatePurchaseOrderByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.PurchaseOrder, error) {
	patch["updatedAt"] = now()
	res := r.col(ColPurchaseOrders).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.PurchaseOrder
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.PurchaseOrder{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeletePurchaseOrderByOrg(ctx context.Context, orgID, id string) error {
	res, err := r.col(ColPurchaseOrders).DeleteOne(ctx, bson.M{"_id": id, "orgId": orgID})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}
