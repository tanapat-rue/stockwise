package repo

import (
	"context"
	"time"

	"stockflows/server/internal/models"
	"stockflows/server/platform/db/mongodb"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/writeconcern"
)

const (
	ColOrganizations   = "organizations"
	ColBranches        = "branches"
	ColUsers           = "users"
	ColSettings        = "settings"
	ColCategories      = "categories"
	ColProducts        = "products"
	ColStockLevels     = "stock_levels"
	ColInventoryLots   = "inventory_lots"
	ColStockMovements  = "stock_movements"
	ColStockTransfers  = "stock_transfers"
	ColCustomers       = "customers"
	ColSuppliers       = "suppliers"
	ColPurchaseOrders  = "purchase_orders"
	ColTransactions    = "transactions"
	ColCounters        = "counters"
)

type Repo struct {
	mongo *mongodb.Client
}

func New(m *mongodb.Client) *Repo {
	return &Repo{mongo: m}
}

func (r *Repo) col(name string) *mongo.Collection {
	return r.mongo.Collection(name)
}

func now() time.Time { return time.Now().UTC() }

func (r *Repo) WithTxn(ctx context.Context, fn func(ctx mongo.SessionContext) error) error {
	wc := writeconcern.Majority()
	session, err := r.mongo.Client.StartSession(options.Session().SetDefaultWriteConcern(wc))
	if err != nil {
		return err
	}
	defer session.EndSession(ctx)

	_, err = session.WithTransaction(ctx, func(sc mongo.SessionContext) (any, error) {
		return nil, fn(sc)
	})
	return err
}

// --- Organizations ---

func (r *Repo) CreateOrg(ctx context.Context, org models.Organization) (models.Organization, error) {
	org.CreatedAt = now()
	org.UpdatedAt = org.CreatedAt
	_, err := r.col(ColOrganizations).InsertOne(ctx, org)
	return org, err
}

func (r *Repo) ListOrgs(ctx context.Context) ([]models.Organization, error) {
	cur, err := r.col(ColOrganizations).Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Organization
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetOrg(ctx context.Context, id string) (models.Organization, error) {
	var org models.Organization
	err := r.col(ColOrganizations).FindOne(ctx, bson.M{"_id": id}).Decode(&org)
	if err == mongo.ErrNoDocuments {
		return models.Organization{}, ErrNotFound
	}
	return org, err
}

func (r *Repo) UpdateOrg(ctx context.Context, id string, patch bson.M) (models.Organization, error) {
	patch["updatedAt"] = now()
	res := r.col(ColOrganizations).FindOneAndUpdate(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": patch},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var out models.Organization
	err := res.Decode(&out)
	if err == mongo.ErrNoDocuments {
		return models.Organization{}, ErrNotFound
	}
	return out, err
}

func (r *Repo) DeleteOrg(ctx context.Context, id string) error {
	_, err := r.col(ColOrganizations).DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// --- Branches ---

func (r *Repo) CreateBranch(ctx context.Context, b models.Branch) (models.Branch, error) {
	b.CreatedAt = now()
	b.UpdatedAt = b.CreatedAt
	_, err := r.col(ColBranches).InsertOne(ctx, b)
	return b, err
}

func (r *Repo) ListBranchesByOrg(ctx context.Context, orgID string) ([]models.Branch, error) {
	cur, err := r.col(ColBranches).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.Branch
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) GetBranch(ctx context.Context, id string) (models.Branch, error) {
	var b models.Branch
	err := r.col(ColBranches).FindOne(ctx, bson.M{"_id": id}).Decode(&b)
	if err == mongo.ErrNoDocuments {
		return models.Branch{}, ErrNotFound
	}
	return b, err
}

func (r *Repo) GetBranchByOrg(ctx context.Context, orgID, id string) (models.Branch, error) {
	var b models.Branch
	err := r.col(ColBranches).FindOne(ctx, bson.M{"_id": id, "orgId": orgID}).Decode(&b)
	if err == mongo.ErrNoDocuments {
		return models.Branch{}, ErrNotFound
	}
	return b, err
}

func (r *Repo) DeleteBranch(ctx context.Context, id string) error {
	_, err := r.col(ColBranches).DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// --- Users ---

func (r *Repo) CreateUser(ctx context.Context, u models.User) (models.User, error) {
	u.CreatedAt = now()
	u.UpdatedAt = u.CreatedAt
	u.IsActive = true
	_, err := r.col(ColUsers).InsertOne(ctx, u)
	return u, err
}

func (r *Repo) GetUser(ctx context.Context, id string) (models.User, error) {
	var u models.User
	err := r.col(ColUsers).FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err == mongo.ErrNoDocuments {
		return models.User{}, ErrNotFound
	}
	return u, err
}

func (r *Repo) GetUserByEmail(ctx context.Context, email string) (models.User, error) {
	var u models.User
	err := r.col(ColUsers).FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err == mongo.ErrNoDocuments {
		return models.User{}, ErrNotFound
	}
	return u, err
}

func (r *Repo) HasAnyUsers(ctx context.Context) (bool, error) {
	res := r.col(ColUsers).FindOne(ctx, bson.M{}, options.FindOne().SetProjection(bson.M{"_id": 1}))
	if err := res.Err(); err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (r *Repo) ListUsersByOrg(ctx context.Context, orgID string) ([]models.User, error) {
	cur, err := r.col(ColUsers).Find(ctx, bson.M{"orgId": orgID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []models.User
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *Repo) UpdateUser(ctx context.Context, userID string, patch bson.M) error {
	patch["updatedAt"] = now()
	res, err := r.col(ColUsers).UpdateOne(ctx, bson.M{"_id": userID}, bson.M{"$set": patch})
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repo) DeleteUser(ctx context.Context, id string) error {
	_, err := r.col(ColUsers).DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// --- Settings ---

func (r *Repo) GetSettings(ctx context.Context, userID string) (models.AppSettings, error) {
	var s models.AppSettings
	err := r.col(ColSettings).FindOne(ctx, bson.M{"_id": userID}).Decode(&s)
	if err == mongo.ErrNoDocuments {
		return models.AppSettings{}, ErrNotFound
	}
	return s, err
}

func (r *Repo) UpsertSettings(ctx context.Context, s models.AppSettings) (models.AppSettings, error) {
	s.UpdatedAt = now()
	_, err := r.col(ColSettings).UpdateOne(
		ctx,
		bson.M{"_id": s.UserID},
		bson.M{"$set": s},
		options.Update().SetUpsert(true),
	)
	return s, err
}
