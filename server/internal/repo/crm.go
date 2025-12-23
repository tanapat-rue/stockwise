package repo

import (
	"context"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Customers ---

func (r *Repo) CreateCustomer(ctx context.Context, c models.Customer) (models.Customer, error) {
	c.CreatedAt = now()
	c.UpdatedAt = c.CreatedAt
	_, err := r.col(ColCustomers).InsertOne(ctx, c)
	return c, err
}

func (r *Repo) ListCustomersByOrg(ctx context.Context, orgID string) ([]models.Customer, error) {
	cur, err := r.col(ColCustomers).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Customer
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetCustomer(ctx context.Context, id string) (models.Customer, error) {
	var c models.Customer
	err := r.col(ColCustomers).FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return models.Customer{}, ErrNotFound
	}
	return c, err
}

func (r *Repo) GetCustomerByOrg(ctx context.Context, orgID, id string) (models.Customer, error) {
	var c models.Customer
	err := r.col(ColCustomers).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&c)
	if err == mongo.ErrNoDocuments {
		return models.Customer{}, ErrNotFound
	}
	return c, err
}

func (r *Repo) UpdateCustomer(ctx context.Context, id string, patch bson.M) (models.Customer, error) {
	patch["updatedAt"] = now()
	res := r.col(ColCustomers).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Customer
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Customer{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdateCustomerByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Customer, error) {
	patch["updatedAt"] = now()
	res := r.col(ColCustomers).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Customer
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Customer{}, ErrNotFound
	}
	return out, err
}

// --- Suppliers ---

func (r *Repo) CreateSupplier(ctx context.Context, s models.Supplier) (models.Supplier, error) {
	s.CreatedAt = now()
	s.UpdatedAt = s.CreatedAt
	_, err := r.col(ColSuppliers).InsertOne(ctx, s)
	return s, err
}

func (r *Repo) ListSuppliersByOrg(ctx context.Context, orgID string) ([]models.Supplier, error) {
	cur, err := r.col(ColSuppliers).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Supplier
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetSupplier(ctx context.Context, id string) (models.Supplier, error) {
	var s models.Supplier
	err := r.col(ColSuppliers).FindOne(ctx, bson.M{"_id": id}).Decode(&s)
	if err == mongo.ErrNoDocuments {
		return models.Supplier{}, ErrNotFound
	}
	return s, err
}

func (r *Repo) GetSupplierByOrg(ctx context.Context, orgID, id string) (models.Supplier, error) {
	var s models.Supplier
	err := r.col(ColSuppliers).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&s)
	if err == mongo.ErrNoDocuments {
		return models.Supplier{}, ErrNotFound
	}
	return s, err
}

func (r *Repo) UpdateSupplier(ctx context.Context, id string, patch bson.M) (models.Supplier, error) {
	patch["updatedAt"] = now()
	res := r.col(ColSuppliers).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Supplier
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Supplier{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) UpdateSupplierByOrg(ctx context.Context, orgID, id string, patch bson.M) (models.Supplier, error) {
	patch["updatedAt"] = now()
	res := r.col(ColSuppliers).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "orgId": orgID},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Supplier
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Supplier{}, ErrNotFound
	}
	return out, err
}
